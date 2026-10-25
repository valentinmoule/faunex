import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';
import { isFamilyPrice } from '../_shared/family-policy.ts';
/** Re-read current billing state, not a potentially out-of-order event payload. */
export async function syncVerifiedFamily(db:SupabaseClient,subscriptionId:string,env:PaddleEnv) {
  const paddle=getPaddleClient(env);
  const sub=await paddle.subscriptions.get(subscriptionId);
  const price=sub.items[0]?.price.importMeta?.externalId;
  if (!isFamilyPrice(price)) return;
  const intentId=sub.customData?.familyIntentId;
  if (typeof intentId!=='string') throw new Error('missing_family_intent');
  const {data:intent,error}=await db.from('family_checkout_intents').select('*').eq('id',intentId).eq('environment',env).maybeSingle();
  if (error) throw error;
  if (!intent || intent.user_id!==sub.customData?.userId || intent.price_id!==price || (intent.subscription_id && intent.subscription_id!==sub.id)) throw new Error('invalid_family_intent');
  if (!intent.subscription_id && Date.parse(sub.createdAt)>Date.parse(intent.expires_at)) throw new Error('expired_family_intent');
  const {data:account,error:accountError}=await db.auth.admin.getUserById(intent.user_id);
  if (accountError || !account.user) throw new Error('family_owner_unavailable');
  const customer=await paddle.customers.get(sub.customerId);
  if (customer.email.toLowerCase()!==account.user.email?.toLowerCase()) throw new Error('family_customer_mismatch');
  // Activation requires a completed payment, not subscription.created alone.
  let paid=false;
  for await (const tx of paddle.transactions.list({subscriptionId:[sub.id],status:['completed']})) {
    if (Number(tx.details?.totals?.total ?? 0)>0) { paid=true; break; }
  }
  const {data:row,error:write}=await db.from('subscriptions').upsert({user_id:intent.user_id,paddle_subscription_id:sub.id,paddle_customer_id:sub.customerId,price_id:price,product_id:'faunex_premium_family',environment:env,status:paid?sub.status:'pending',current_period_start:sub.currentBillingPeriod?.startsAt,current_period_end:sub.currentBillingPeriod?.endsAt,cancel_at_period_end:sub.scheduledChange?.action==='cancel',scheduled_change_action:sub.scheduledChange?.action ?? null,scheduled_change_at:sub.scheduledChange?.effectiveAt ?? null,updated_at:new Date().toISOString()},{onConflict:'paddle_subscription_id'}).select('id').single();
  if (write) throw write;
  const {error:bind}=await db.from('family_checkout_intents').update({subscription_id:sub.id}).eq('id',intent.id);
  if (bind) throw bind;
  if (paid && row && sub.status==='active') {
    const {error:create}=await db.rpc('ensure_paid_family',{p_subscription:row.id});
    if (create) throw create;
  }
}