INSERT INTO public.subscriptions (user_id, paddle_subscription_id, paddle_customer_id, product_id, price_id, status, current_period_start, current_period_end, cancel_at_period_end, environment)
SELECT u, 'manual_grant_'||u||'_'||env, 'manual_'||u, 'faunex_premium', 'faunex_premium_monthly', 'active', now(), now() + interval '100 years', false, env
FROM (VALUES ('fb53d7d5-d325-4ac7-8ff9-b95637e5a561'::uuid), ('4ce7dc35-7deb-4350-b51d-7df8d4b150dc'::uuid)) AS a(u),
     (VALUES ('live'), ('sandbox')) AS b(env)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = a.u AND s.environment = b.env AND s.status = 'active'
);