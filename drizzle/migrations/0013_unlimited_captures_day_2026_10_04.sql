-- Journée « captures illimitées » le 2026-10-04 (heure de Paris) :
-- tout le monde (Premium ou non) passe au plafond de 200 analyses/jour ce jour-là.
-- La règle s'éteint toute seule après minuit, aucune migration de retour nécessaire.

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
  v_limit := CASE
    WHEN (now() AT TIME ZONE 'Europe/Paris')::date = DATE '2026-10-04' THEN 200
    WHEN v_premium THEN 200
    ELSE 4
  END;

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

REVOKE ALL ON FUNCTION public.consume_ai_analysis(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_analysis(uuid, uuid) TO service_role;

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

  v_limit := CASE
    WHEN (now() AT TIME ZONE 'Europe/Paris')::date = DATE '2026-10-04' THEN 200
    WHEN public.is_premium(v_user) THEN 200
    ELSE 4
  END;

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