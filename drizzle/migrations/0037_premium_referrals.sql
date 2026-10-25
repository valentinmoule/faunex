CREATE TABLE public.referral_codes (
 user_id uuid PRIMARY KEY, code text NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(6),'hex')), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_code ON public.referral_codes FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referred_user_id uuid NOT NULL, referrer_user_id uuid NOT NULL,
 environment text NOT NULL CHECK(environment IN ('live','sandbox')), created_at timestamptz NOT NULL DEFAULT now(),
 transaction_id text UNIQUE, subscription_id text, rewarded_at timestamptz,
 UNIQUE(referred_user_id,environment), CHECK(referred_user_id<>referrer_user_id)
);
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.referral_rewards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referral_id uuid NOT NULL REFERENCES public.referrals(id), user_id uuid NOT NULL,
 environment text NOT NULL, days integer NOT NULL DEFAULT 30 CHECK(days=30), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 billing_subscription_id text, billing_target_at timestamptz, billing_applied_at timestamptz,
 UNIQUE(referral_id,user_id)
);
GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rewards ON public.referral_rewards FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX referral_rewards_entitlement ON public.referral_rewards(user_id,environment,ends_at);
CREATE FUNCTION public.my_referral_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 INSERT INTO public.referral_codes(user_id) VALUES(auth.uid()) ON CONFLICT(user_id) DO NOTHING;
 SELECT code INTO result FROM public.referral_codes WHERE user_id=auth.uid(); RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.my_referral_code() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_referral_code() TO authenticated;
CREATE FUNCTION public.reserve_referral(p_code text,p_env text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; result uuid; me uuid:=auth.uid();
BEGIN
 IF me IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF p_env NOT IN ('live','sandbox') THEN RAISE EXCEPTION 'invalid_environment'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(me::text,0));
 SELECT user_id INTO owner_id FROM public.referral_codes WHERE code=upper(trim(p_code));
 IF owner_id IS NULL THEN RAISE EXCEPTION 'invalid_code'; END IF;
 IF owner_id=me THEN RAISE EXCEPTION 'self_referral'; END IF;
 IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=me AND environment=p_env)
 OR EXISTS(SELECT 1 FROM public.referral_rewards WHERE user_id=me AND environment=p_env) THEN RAISE EXCEPTION 'existing_customer'; END IF;
 SELECT id INTO result FROM public.referrals WHERE referred_user_id=me AND environment=p_env;
 IF result IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM public.referrals WHERE id=result AND referrer_user_id<>owner_id) THEN RAISE EXCEPTION 'referral_already_set'; END IF;
  RETURN result;
 END IF;
 INSERT INTO public.referrals(referred_user_id,referrer_user_id,environment) VALUES(me,owner_id,p_env) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.reserve_referral(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reserve_referral(text,text) TO authenticated;
CREATE FUNCTION public.confirm_paid_referral(p_referral uuid,p_transaction text,p_subscription text,p_env text,p_customer text,p_paid_start timestamptz,p_paid_end timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.referrals; recipient uuid; base timestamptz; billing_id text; billing_end timestamptz;
BEGIN
 SELECT * INTO r FROM public.referrals WHERE id=p_referral AND environment=p_env FOR UPDATE;
 IF r.id IS NULL OR r.rewarded_at IS NOT NULL THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.referred_user_id::text,0));
 IF p_paid_end IS NULL OR p_paid_start IS NULL OR p_paid_end<=p_paid_start THEN RAISE EXCEPTION 'missing_paid_period'; END IF;
 IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=r.referred_user_id AND environment=p_env AND paddle_subscription_id<>p_subscription)
 OR EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=r.referrer_user_id AND environment=p_env AND paddle_customer_id=p_customer)
 OR EXISTS(SELECT 1 FROM public.referral_rewards WHERE user_id=r.referred_user_id AND environment=p_env)
 THEN RETURN; END IF;
 UPDATE public.referrals SET transaction_id=p_transaction,subscription_id=p_subscription,rewarded_at=now() WHERE id=r.id;
 FOREACH recipient IN ARRAY ARRAY[r.referred_user_id,r.referrer_user_id] LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(recipient::text,1));
  billing_id:=NULL; billing_end:=NULL;
  IF recipient=r.referred_user_id THEN billing_id:=p_subscription; billing_end:=p_paid_end;
  ELSE
   SELECT paddle_subscription_id,current_period_end INTO billing_id,billing_end FROM public.subscriptions
   WHERE user_id=recipient AND environment=p_env AND status='active' AND NOT coalesce(cancel_at_period_end,false)
   AND scheduled_change_action IS NULL AND current_period_end>now() ORDER BY current_period_end DESC LIMIT 1;
  END IF;
  SELECT greatest(now(),coalesce(max(current_period_end),now()),coalesce(billing_end,now())) INTO base FROM public.subscriptions
  WHERE user_id=recipient AND environment=p_env AND status IN ('active','trialing','paused','past_due','canceled');
  SELECT greatest(base,coalesce(max(ends_at),base)) INTO base FROM public.referral_rewards WHERE user_id=recipient AND environment=p_env;
  INSERT INTO public.referral_rewards(referral_id,user_id,environment,starts_at,ends_at,billing_subscription_id,billing_target_at)
  VALUES(r.id,recipient,p_env,base,base+interval '30 days',billing_id,CASE WHEN billing_id IS NOT NULL THEN base+interval '30 days' END);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.confirm_paid_referral(uuid,text,text,text,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_paid_referral(uuid,text,text,text,text,timestamptz,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid,check_env text DEFAULT 'live') RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=user_uuid AND environment=check_env AND (
 (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end>now())) OR
 (status IN ('paused','past_due','canceled') AND current_period_end>now())))
 OR EXISTS(SELECT 1 FROM public.referral_rewards WHERE user_id=user_uuid AND environment=check_env AND starts_at<=now() AND ends_at>now());
$$;