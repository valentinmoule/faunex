BEGIN;
DO $$
DECLARE payer uuid; guest uuid; guest_email text; other_user uuid; sub uuid; fam uuid; invitation jsonb; refused boolean;
BEGIN
 SELECT u.id,u.email INTO guest,guest_email FROM auth.users u JOIN public.profiles p ON p.user_id=u.id WHERE u.email_confirmed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=u.id AND left_at IS NULL) LIMIT 1;
 SELECT user_id INTO payer FROM public.profiles WHERE user_id<>guest AND NOT EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=profiles.user_id AND left_at IS NULL) LIMIT 1;
 SELECT id INTO other_user FROM auth.users WHERE id NOT IN (guest,payer) LIMIT 1;
 IF payer IS NULL OR guest IS NULL OR other_user IS NULL THEN RAISE EXCEPTION 'test_accounts_required'; END IF;
 INSERT INTO public.subscriptions(user_id,paddle_subscription_id,paddle_customer_id,product_id,price_id,status,environment,current_period_end) VALUES(payer,'email_test_'||gen_random_uuid(),'test_customer','faunex_premium_family','faunex_premium_family_yearly','active','live',now()+interval '1 year') RETURNING id INTO sub;
 fam:=public.ensure_paid_family(sub);
 invitation:=public.create_family_email_invitation(payer,upper(guest_email));
 IF (SELECT recipient_email FROM public.family_invitations WHERE id=(invitation->>'id')::uuid)<>lower(guest_email) THEN RAISE EXCEPTION 'email_normalization_failed'; END IF;
 refused:=false; BEGIN PERFORM public.create_family_email_invitation(guest,'new@example.com'); EXCEPTION WHEN OTHERS THEN refused:=SQLERRM='owner_required'; END; IF NOT refused THEN RAISE EXCEPTION 'guest_can_invite'; END IF;
 refused:=false; BEGIN PERFORM public.create_family_email_invitation(payer,guest_email); EXCEPTION WHEN OTHERS THEN refused:=SQLERRM='invitation_pending'; END; IF NOT refused THEN RAISE EXCEPTION 'duplicate_email_allowed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',other_user::text,true);
 refused:=false; BEGIN PERFORM public.accept_family_invitation(invitation->>'token'); EXCEPTION WHEN OTHERS THEN refused:=SQLERRM='invitation_email_mismatch'; END; IF NOT refused THEN RAISE EXCEPTION 'wrong_email_accepted'; END IF;
 IF (SELECT accepted_at FROM public.family_invitations WHERE id=(invitation->>'id')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'wrong_account_consumed_invite'; END IF;
 PERFORM set_config('request.jwt.claim.sub',guest::text,true);
 IF public.accept_family_invitation(invitation->>'token')<>fam THEN RAISE EXCEPTION 'recipient_not_joined'; END IF;
 IF NOT public.has_active_subscription(guest,'live') THEN RAISE EXCEPTION 'recipient_missing_premium'; END IF;
 IF has_function_privilege('authenticated','public.create_family_email_invitation(uuid,text)','execute') THEN RAISE EXCEPTION 'client_can_impersonate_owner'; END IF;
END $$;
ROLLBACK;