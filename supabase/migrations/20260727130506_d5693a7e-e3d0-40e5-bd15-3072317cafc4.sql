CREATE OR REPLACE FUNCTION public.enforce_daily_capture_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS enforce_daily_capture_limit_trg ON public.captures;
CREATE TRIGGER enforce_daily_capture_limit_trg
BEFORE INSERT ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_capture_limit();

CREATE OR REPLACE FUNCTION public.captures_remaining_today()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, 4 - (
    SELECT COUNT(*)::int FROM public.captures
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day'
  ));
$$;

GRANT EXECUTE ON FUNCTION public.captures_remaining_today() TO authenticated;
