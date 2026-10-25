CREATE TABLE public.family_complimentary_grants (
 family_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
 granted_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz,
 revoked_at timestamptz,
 reason text NOT NULL
);
GRANT ALL ON public.family_complimentary_grants TO service_role;
ALTER TABLE public.family_complimentary_grants ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.family_valid(p_family uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
 SELECT EXISTS(SELECT 1 FROM public.families f JOIN public.subscriptions s ON s.id=f.subscription_id WHERE f.id=p_family AND f.closed_at IS NULL AND s.user_id=f.owner_id AND s.environment=f.environment AND (
 EXISTS(SELECT 1 FROM public.family_complimentary_grants g WHERE g.family_id=f.id AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now()))
 OR (s.price_id IN ('faunex_premium_family_yearly','faunex_premium_family_monthly') AND ((s.status IN ('active','trialing') AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.status IN ('paused','past_due','canceled') AND s.current_period_end>now()) OR EXISTS(SELECT 1 FROM public.referral_rewards r WHERE r.user_id=f.owner_id AND r.environment=f.environment AND r.billing_subscription_id=s.paddle_subscription_id AND r.starts_at<=now() AND r.ends_at>now())))
 ));
$function$;