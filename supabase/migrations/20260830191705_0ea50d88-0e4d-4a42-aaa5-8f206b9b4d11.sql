CREATE OR REPLACE FUNCTION public.consume_ai_analysis(p_user uuid, p_request uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_premium boolean;
  v_count integer;
BEGIN
  IF p_user IS NULL OR p_request IS NULL THEN
    RAISE EXCEPTION 'INVALID_AI_ATTEMPT';
  END IF;

  DELETE FROM public.ai_analysis_attempts
  WHERE created_at < now() - interval '3 days';

  v_premium := public.is_premium(p_user);
  v_limit := CASE WHEN v_premium THEN 200 ELSE 4 END;

  IF EXISTS (
    SELECT 1 FROM public.ai_analysis_attempts
    WHERE user_id = p_user AND request_id = p_request
  ) THEN
    SELECT COUNT(*) INTO v_count
    FROM public.ai_analysis_attempts
    WHERE user_id = p_user
      AND created_at >= date_trunc('day', now());
    RETURN GREATEST(0, v_limit - v_count);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.ai_analysis_attempts
  WHERE user_id = p_user
    AND created_at >= date_trunc('day', now());

  IF v_count >= v_limit THEN
    RETURN CASE WHEN v_premium THEN -2 ELSE -1 END;
  END IF;

  INSERT INTO public.ai_analysis_attempts (user_id, request_id)
  VALUES (p_user, p_request)
  ON CONFLICT (user_id, request_id) WHERE request_id IS NOT NULL DO NOTHING;

  RETURN GREATEST(0, v_limit - v_count - 1);
END;
$function$;