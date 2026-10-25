-- Run transactionally through the managed database tool; no data is retained.
BEGIN;
DO $$
DECLARE owner uuid:=gen_random_uuid(); guest uuid:=gen_random_uuid(); third uuid:=gen_random_uuid(); fourth uuid:=gen_random_uuid(); fifth uuid:=gen_random_uuid(); subscription uuid; family uuid; invitation text; replay text; refused boolean;
BEGIN
 INSERT INTO public.subscriptions(user_id,paddle_subscription_id,paddle_customer_id,product_id,price_id,status,environment,current_period_end)
 VALUES(owner,'family_test_'||owner,'ctm_test_'||owner,'faunex_premium_family','faunex_premium_family_yearly','active','live',now()+interval '1 year') RETURNING id INTO subscription;
 family:=public.ensure_paid_family(subscription);
 IF public.ensure_paid_family(subscription)<>family THEN RAISE EXCEPTION 'idempotence_failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 invitation:=public.create_family_invitation();replay:=invitation;
 IF (SELECT expires_at-created_at FROM public.family_invitations WHERE family_id=family)<>interval '7 days' THEN RAISE EXCEPTION 'expiry_failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',guest::text,true);PERFORM public.accept_family_invitation(invitation);
 IF NOT public.has_active_subscription(guest,'live') OR public.has_active_subscription(guest,'sandbox') THEN RAISE EXCEPTION 'environment_failed'; END IF;
 refused:=false;BEGIN PERFORM public.accept_family_invitation(replay); EXCEPTION WHEN OTHERS THEN refused:=SQLERRM='invalid_invitation';END;IF NOT refused THEN RAISE EXCEPTION 'replay_accepted';END IF;
 refused:=false;BEGIN PERFORM public.create_family_invitation(); EXCEPTION WHEN OTHERS THEN refused:=SQLERRM='owner_required';END;IF NOT refused THEN RAISE EXCEPTION 'guest_invited';END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);invitation:=public.create_family_invitation();
 PERFORM set_config('request.jwt.claim.sub',third::text,true);PERFORM public.accept_family_invitation(invitation);
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);invitation:=public.create_family_invitation();
 refused:=false;BEGIN PERFORM public.create_family_invitation();EXCEPTION WHEN OTHERS THEN refused:=SQLERRM='family_full';END;IF NOT refused THEN RAISE EXCEPTION 'reservation_limit_failed';END IF;
 PERFORM set_config('request.jwt.claim.sub',fourth::text,true);PERFORM public.accept_family_invitation(invitation);
 IF (SELECT count(*) FROM public.family_memberships WHERE family_id=family AND left_at IS NULL)<>4 THEN RAISE EXCEPTION 'capacity_failed';END IF;
 PERFORM public.remove_family_member(fourth);
 IF public.has_active_subscription(fourth,'live') THEN RAISE EXCEPTION 'removed_still_premium';END IF;
 UPDATE public.subscriptions SET status='canceled',current_period_end=now()-interval '1 second' WHERE id=subscription;
 IF public.has_active_subscription(guest,'live') THEN RAISE EXCEPTION 'expired_still_premium';END IF;
 IF has_function_privilege('authenticated','public.ensure_paid_family(uuid)','execute') THEN RAISE EXCEPTION 'client_can_activate';END IF;
END $$;
ROLLBACK;