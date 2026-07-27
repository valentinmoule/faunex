CREATE TABLE public.capture_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.capture_attempts TO authenticated;
GRANT ALL ON public.capture_attempts TO service_role;

ALTER TABLE public.capture_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attempts"
ON public.capture_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can record their own attempts"
ON public.capture_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_capture_attempts_user_day ON public.capture_attempts (user_id, created_at DESC);

-- Remaining captures for today, based on AI analysis attempts
CREATE OR REPLACE FUNCTION public.captures_remaining_today()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(0, 4 - (
    SELECT COUNT(*)::int FROM public.capture_attempts
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day'
  ));
$$;

GRANT EXECUTE ON FUNCTION public.captures_remaining_today() TO authenticated;

-- Records an attempt and returns the number of captures left today.
CREATE OR REPLACE FUNCTION public.record_capture_attempt()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.capture_attempts
  WHERE user_id = v_user
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day';

  IF v_count >= 4 THEN
    RAISE EXCEPTION 'DAILY_CAPTURE_LIMIT_REACHED'
      USING HINT = 'Limite de 4 captures par jour atteinte.';
  END IF;

  INSERT INTO public.capture_attempts (user_id) VALUES (v_user);

  RETURN GREATEST(0, 4 - (v_count + 1));
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_capture_attempt() TO authenticated;

-- Saving a capture must not consume a second slot: the attempt already counted.
CREATE OR REPLACE FUNCTION public.enforce_daily_capture_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.captures
  WHERE user_id = NEW.user_id
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day';

  IF v_count >= 4 THEN
    RAISE EXCEPTION 'DAILY_CAPTURE_LIMIT_REACHED'
      USING HINT = 'Limite de 4 captures par jour atteinte.';
  END IF;

  RETURN NEW;
END;
$$;