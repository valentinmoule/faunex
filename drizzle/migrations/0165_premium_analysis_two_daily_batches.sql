CREATE OR REPLACE FUNCTION public.ai_quota_status_for(p_user uuid, p_now timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_premium boolean := public.is_premium(p_user);
  v_day timestamptz := date_trunc('day', p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_count integer;
  v_200_at timestamptz;
  v_retry timestamptz;
BEGIN
  SELECT count(*) INTO v_count FROM public.ai_analysis_attempts
  WHERE user_id = p_user AND created_at >= v_day AND created_at <= p_now;
  IF v_premium AND v_count >= 400 THEN
    RETURN jsonb_build_object('premium', true, 'remaining', 0, 'reason', 'premium_daily_limit', 'retry_at', v_day + interval '1 day');
  END IF;
  IF v_premium AND v_count >= 200 THEN
    SELECT created_at INTO v_200_at FROM public.ai_analysis_attempts
    WHERE user_id = p_user AND created_at >= v_day AND created_at <= p_now
    ORDER BY created_at, id OFFSET 199 LIMIT 1;
    v_retry := LEAST(v_200_at + interval '1 hour', v_day + interval '1 day');
    IF p_now < v_retry THEN
      RETURN jsonb_build_object('premium', true, 'remaining', 0, 'reason', 'premium_pause', 'retry_at', v_retry);
    END IF;
  END IF;
  IF NOT v_premium AND v_count >= 4 THEN
    RETURN jsonb_build_object('premium', false, 'remaining', 0, 'reason', 'free_daily_limit', 'retry_at', v_day + interval '1 day');
  END IF;
  RETURN jsonb_build_object('premium', v_premium, 'remaining', GREATEST(0, CASE WHEN v_premium THEN 400 ELSE 4 END - v_count), 'reason', 'available', 'retry_at', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.ai_quota_status_for(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_quota_status_for(uuid, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.get_ai_analysis_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('premium', false, 'remaining', 0, 'reason', 'unauthenticated', 'retry_at', NULL);
  END IF;
  RETURN public.ai_quota_status_for(auth.uid(), now());
END;
$$;
REVOKE ALL ON FUNCTION public.get_ai_analysis_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_analysis_status() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ai_analyses_remaining_today()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (public.get_ai_analysis_status()->>'remaining')::integer; $$;
REVOKE ALL ON FUNCTION public.ai_analyses_remaining_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_analyses_remaining_today() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_analysis(p_user uuid, p_request uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status jsonb;
  v_now timestamptz;
BEGIN
  IF p_user IS NULL OR p_request IS NULL THEN
    RAISE EXCEPTION 'INVALID_AI_ATTEMPT';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ai-analysis:' || p_user::text, 0));
  v_now := clock_timestamp();
  v_status := public.ai_quota_status_for(p_user, v_now);
  -- A previously accepted request remains idempotent, even during the pause.
  IF EXISTS (SELECT 1 FROM public.ai_analysis_attempts WHERE user_id = p_user AND request_id = p_request) THEN
    RETURN (v_status->>'remaining')::integer;
  END IF;
  IF v_status->>'reason' = 'premium_pause' THEN RETURN -2; END IF;
  IF v_status->>'reason' = 'premium_daily_limit' THEN RETURN -3; END IF;
  IF v_status->>'reason' = 'free_daily_limit' THEN RETURN -1; END IF;
  INSERT INTO public.ai_analysis_attempts(user_id, request_id, created_at)
  VALUES(p_user, p_request, v_now)
  ON CONFLICT (user_id, request_id) WHERE request_id IS NOT NULL DO NOTHING;
  v_status := public.ai_quota_status_for(p_user, clock_timestamp());
  RETURN (v_status->>'remaining')::integer;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_analysis(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_analysis(uuid, uuid) TO service_role;

-- Legacy callers must use the same authoritative guard, not bypass Premium protection.
CREATE OR REPLACE FUNCTION public.consume_ai_analysis(p_user uuid)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.consume_ai_analysis(p_user, gen_random_uuid()); $$;
REVOKE ALL ON FUNCTION public.consume_ai_analysis(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_analysis(uuid) TO service_role;