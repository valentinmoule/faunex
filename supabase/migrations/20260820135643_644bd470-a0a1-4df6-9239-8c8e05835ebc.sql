CREATE TABLE public.nearby_search_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX nearby_search_attempts_user_day_idx ON public.nearby_search_attempts (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.nearby_search_attempts TO authenticated;
GRANT ALL ON public.nearby_search_attempts TO service_role;
ALTER TABLE public.nearby_search_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nearby attempts select" ON public.nearby_search_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own nearby attempts insert" ON public.nearby_search_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.nearby_searches_remaining_today()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_premium(auth.uid()) THEN 999
    ELSE GREATEST(0, 4 - (
      SELECT COUNT(*)::int FROM public.nearby_search_attempts
      WHERE user_id = auth.uid()
        AND created_at >= date_trunc('day', now())
        AND created_at < date_trunc('day', now()) + interval '1 day'
    ))
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_nearby_search()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF public.is_premium(v_user) THEN
    INSERT INTO public.nearby_search_attempts (user_id) VALUES (v_user);
    RETURN 999;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.nearby_search_attempts
  WHERE user_id = v_user
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day';

  IF v_count >= 4 THEN
    RAISE EXCEPTION 'DAILY_NEARBY_LIMIT_REACHED'
      USING HINT = 'Limite de 4 explorations par jour atteinte.';
  END IF;

  INSERT INTO public.nearby_search_attempts (user_id) VALUES (v_user);
  RETURN GREATEST(0, 4 - (v_count + 1));
END;
$$;