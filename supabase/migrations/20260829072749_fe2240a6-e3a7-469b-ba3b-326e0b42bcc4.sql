CREATE OR REPLACE FUNCTION public.consume_ai_analysis(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit constant integer := 4;
  v_count integer;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Premium : analyses illimitées, aucun enregistrement.
  IF public.is_premium(p_user) THEN
    RETURN 999999;
  END IF;

  DELETE FROM public.ai_analysis_attempts
  WHERE created_at < now() - interval '3 days';

  SELECT COUNT(*) INTO v_count
  FROM public.ai_analysis_attempts
  WHERE user_id = p_user
    AND created_at >= date_trunc('day', now());

  IF v_count >= v_limit THEN
    RETURN -1;
  END IF;

  INSERT INTO public.ai_analysis_attempts (user_id) VALUES (p_user);
  RETURN GREATEST(0, v_limit - v_count - 1);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_ai_analysis(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_analysis(uuid) TO service_role;