CREATE OR REPLACE FUNCTION public.refund_capture_attempt()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT id INTO v_id
  FROM public.capture_attempts
  WHERE user_id = v_user
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    DELETE FROM public.capture_attempts WHERE id = v_id;
  END IF;

  IF public.is_premium(v_user) THEN
    RETURN 999;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.capture_attempts
  WHERE user_id = v_user
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day';

  RETURN GREATEST(0, 4 - v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_capture_attempt() TO authenticated;