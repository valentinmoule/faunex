CREATE OR REPLACE FUNCTION public.ai_analyses_remaining_today()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_limit integer;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN 0;
  END IF;

  v_limit := CASE WHEN public.is_premium(v_user) THEN 200 ELSE 4 END;

  SELECT COUNT(*) INTO v_count
  FROM public.ai_analysis_attempts
  WHERE user_id = v_user
    AND created_at >= date_trunc('day', now());

  RETURN GREATEST(0, v_limit - v_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.ai_analyses_remaining_today() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_analyses_remaining_today() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_analyses_remaining_today() TO service_role;