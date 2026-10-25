-- Run transactionally through the managed database tool; no data is retained.
BEGIN;
DO $$
DECLARE owner uuid; sub uuid; fam uuid;
BEGIN
 SELECT user_id INTO owner FROM public.profiles WHERE NOT EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=profiles.user_id AND left_at IS NULL) LIMIT 1;
 IF owner IS NULL THEN RAISE EXCEPTION 'test_requires_existing_account'; END IF;
 INSERT INTO public.subscriptions(user_id,paddle_subscription_id,paddle_customer_id,product_id,price_id,status,environment,current_period_end)
 VALUES(owner,'fam_renew_'||owner,'ctm_renew_'||owner,'faunex_premium_family','faunex_premium_family_yearly','active','live',now()+interval '30 days') RETURNING id INTO sub;
 fam := public.ensure_paid_family(sub);
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 IF (public.my_family()->>'renews_at')::timestamptz <> (SELECT current_period_end FROM public.subscriptions WHERE id=sub) THEN RAISE EXCEPTION 'billing_date_missing'; END IF;
 INSERT INTO public.family_complimentary_grants(family_id,reason) VALUES(fam,'test');
 IF public.my_family()->>'renews_at' IS NOT NULL THEN RAISE EXCEPTION 'lifetime_grant_shows_date'; END IF;
 UPDATE public.family_complimentary_grants SET expires_at=now()+interval '10 days' WHERE family_id=fam;
 IF (public.my_family()->>'renews_at')::timestamptz < now()+interval '9 days' THEN RAISE EXCEPTION 'grant_date_ignored'; END IF;
 UPDATE public.family_complimentary_grants SET revoked_at=now() WHERE family_id=fam;
 UPDATE public.subscriptions SET cancel_at_period_end=true WHERE id=sub;
 IF NOT (public.my_family()->>'cancel_at_period_end')::boolean THEN RAISE EXCEPTION 'cancel_flag_missing'; END IF;
 IF public.my_family()->>'renews_at' IS NULL THEN RAISE EXCEPTION 'date_lost_after_revoke'; END IF;
END $$;
ROLLBACK;
