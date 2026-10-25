-- Privileged transactional integration test; all fixtures roll back.
BEGIN;
DO $$
DECLARE sponsor uuid:=gen_random_uuid(); buyer uuid:=gen_random_uuid(); r uuid; own_code text; result uuid;
BEGIN
 INSERT INTO public.referral_codes(user_id,code) VALUES(sponsor,'TESTREFERRAL');
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 SELECT public.reserve_referral('testreferral','sandbox') INTO r;
 IF EXISTS(SELECT 1 FROM public.referral_rewards WHERE referral_id=r) THEN RAISE EXCEPTION 'Using a code must not reward either account'; END IF;
 SELECT public.reserve_referral('TESTREFERRAL','sandbox') INTO result;
 IF result<>r THEN RAISE EXCEPTION 'Reservation retries must keep the same referral'; END IF;
 PERFORM set_config('request.jwt.claim.sub',sponsor::text,true);
 BEGIN
  PERFORM public.reserve_referral('TESTREFERRAL','sandbox');
  RAISE EXCEPTION 'Self-referral was allowed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'self_referral' THEN RAISE; END IF;
 END;
 PERFORM public.confirm_paid_referral(r,'txn_referral_test','sub_referral_test','sandbox','ctm_referral_test',now(),now()+interval '365 days');
 IF (SELECT count(*) FROM public.referral_rewards WHERE referral_id=r)<>2 THEN RAISE EXCEPTION 'Both users must receive a reward'; END IF;
 IF EXISTS(SELECT 1 FROM public.referral_rewards WHERE referral_id=r AND (days<>30 OR ends_at-starts_at<>interval '30 days')) THEN RAISE EXCEPTION 'Each reward must be exactly 30 days'; END IF;
 IF (SELECT starts_at FROM public.referral_rewards WHERE user_id=buyer)<>now()+interval '365 days' THEN RAISE EXCEPTION 'Buyer bonus must start at paid period end'; END IF;
 IF NOT public.has_active_subscription(sponsor,'sandbox') OR public.has_active_subscription(sponsor,'live') THEN RAISE EXCEPTION 'Sponsor bonus must work only in its environment'; END IF;
 PERFORM public.confirm_paid_referral(r,'txn_referral_test','sub_referral_test','sandbox','ctm_referral_test',now(),now()+interval '365 days');
 IF (SELECT count(*) FROM public.referral_rewards WHERE referral_id=r)<>2 THEN RAISE EXCEPTION 'Payment retries must not duplicate rewards'; END IF;
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 BEGIN
  PERFORM public.reserve_referral('TESTREFERRAL','sandbox');
  RAISE EXCEPTION 'Existing Premium customer was allowed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'existing_customer' THEN RAISE; END IF;
 END;
 IF has_function_privilege('authenticated','public.confirm_paid_referral(uuid,text,text,text,text,timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Clients must not confirm payment'; END IF;
END $$;
ROLLBACK;