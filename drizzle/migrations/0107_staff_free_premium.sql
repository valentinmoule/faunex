CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
 SELECT public.is_staff(user_uuid)
 OR EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=user_uuid AND environment=check_env AND ((status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end>now())) OR (status IN ('paused','past_due','canceled') AND current_period_end>now())))
 OR EXISTS(SELECT 1 FROM public.referral_rewards WHERE user_id=user_uuid AND environment=check_env AND starts_at<=now() AND ends_at>now())
 OR EXISTS(SELECT 1 FROM public.family_memberships m JOIN public.families f ON f.id=m.family_id WHERE m.user_id=user_uuid AND m.left_at IS NULL AND f.environment=check_env AND public.family_valid(f.id));
$function$;