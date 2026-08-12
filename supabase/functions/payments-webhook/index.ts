import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

/** Mirror the Paddle customer. Idempotent: upsert keyed on the Paddle customer ID. */
async function upsertCustomer(
  paddleCustomerId: string,
  env: PaddleEnv,
  fields: { email?: string | null; name?: string | null; userId?: string | null }
) {
  if (!paddleCustomerId) return;
  const row: Record<string, unknown> = {
    paddle_customer_id: paddleCustomerId,
    environment: env,
    updated_at: new Date().toISOString(),
  };
  if (fields.email !== undefined && fields.email !== null) row.email = fields.email;
  if (fields.name !== undefined && fields.name !== null) row.name = fields.name;
  if (fields.userId) row.user_id = fields.userId;

  const { error } = await getSupabase()
    .from('paddle_customers')
    .upsert(row, { onConflict: 'paddle_customer_id' });
  if (error) console.error('Upsert paddle_customer failed:', error);
}

async function handleCustomerUpserted(data: any, env: PaddleEnv) {
  await upsertCustomer(data?.id, env, {
    email: data?.email ?? null,
    name: data?.name ?? null,
    userId: data?.customData?.userId ?? null,
  });
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData, scheduledChange } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error('No userId in customData');
    return;
  }

  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing importMeta.externalId', {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  await upsertCustomer(customerId, env, { userId });

  const { error } = await getSupabase().from('subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === 'cancel',
    scheduled_change_action: scheduledChange?.action ?? null,
    scheduled_change_at: scheduledChange?.effectiveAt ?? null,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'paddle_subscription_id' });

  if (error) console.error('Upsert subscription failed:', error);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange } = data;

  const { error } = await getSupabase().from('subscriptions')
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      // A scheduled change is recorded but never revokes access on its own.
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      scheduled_change_action: scheduledChange?.action ?? null,
      scheduled_change_at: scheduledChange?.effectiveAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', id)
    .eq('environment', env);

  if (error) console.error('Update subscription failed:', error);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const { error } = await getSupabase().from('subscriptions')
    .update({
      status: 'canceled',
      scheduled_change_action: null,
      scheduled_change_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);

  if (error) console.error('Cancel subscription failed:', error);
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  // Transaction events carry no product object; they are used here to keep the
  // mirrored subscription fresh (renewals arrive before subscription.updated).
  if (data?.customerId) {
    await upsertCustomer(data.customerId, env, {
      userId: data?.customData?.userId ?? null,
    });
  }

  if (!data?.subscriptionId) return;

  const { error } = await getSupabase().from('subscriptions')
    .update({
      current_period_start: data?.billingPeriod?.startsAt,
      current_period_end: data?.billingPeriod?.endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.subscriptionId)
    .eq('environment', env);

  if (error) console.error('Transaction sync failed:', error);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  // Signature is verified against the RAW body before anything else.
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      await handleCustomerUpserted(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    default:
      // Safely ignored event types.
      console.log('Unhandled event:', event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Never 2xx on failure: Paddle must keep retrying.
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
