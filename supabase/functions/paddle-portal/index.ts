import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authentication first — the customer ID is never taken from the client.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not authenticated' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Not authenticated' }, 401);

    const userId = userData.user.id;

    // 2. Resolve the Paddle customer server-side from the mirrored tables.
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('paddle_customer_id, paddle_subscription_id, environment')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId = sub?.paddle_customer_id as string | undefined;
    let env = (sub?.environment as PaddleEnv | undefined) ?? undefined;

    if (!customerId) {
      const { data: customer } = await supabase
        .from('paddle_customers')
        .select('paddle_customer_id, environment')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      customerId = customer?.paddle_customer_id as string | undefined;
      env = (customer?.environment as PaddleEnv | undefined) ?? env;
    }

    if (!customerId) return json({ error: 'No subscription found' }, 404);

    // 3. Mint the Paddle-hosted portal session.
    const paddle = getPaddleClient(env ?? 'sandbox');
    const subscriptionIds = sub?.paddle_subscription_id
      ? [sub.paddle_subscription_id as string]
      : [];
    const session = await paddle.customerPortalSessions.create(customerId, subscriptionIds);

    const url =
      session.urls?.general?.overview ??
      session.urls?.subscriptions?.[0]?.updateSubscriptionPaymentMethod;

    if (!url) return json({ error: 'Portal session has no URL' }, 502);

    return json({ url });
  } catch (e) {
    console.error('paddle-portal error:', e);
    return json({ error: String(e) }, 500);
  }
});
