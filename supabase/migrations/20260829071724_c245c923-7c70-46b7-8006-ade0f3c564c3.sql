CREATE TABLE IF NOT EXISTS public.ai_analysis_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_analysis_attempts_user_day
  ON public.ai_analysis_attempts (user_id, created_at DESC);

GRANT SELECT ON public.ai_analysis_attempts TO authenticated;
GRANT ALL ON public.ai_analysis_attempts TO service_role;

ALTER TABLE public.ai_analysis_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own ai analysis attempts" ON public.ai_analysis_attempts;
CREATE POLICY "own ai analysis attempts"
  ON public.ai_analysis_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.consume_ai_analysis(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  DELETE FROM public.ai_analysis_attempts
  WHERE created_at < now() - interval '3 days';

  v_limit := CASE WHEN public.is_premium(p_user) THEN 60 ELSE 15 END;

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