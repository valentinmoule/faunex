CREATE OR REPLACE FUNCTION public.enforce_daily_capture_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_limit integer;
BEGIN
  IF public.is_premium(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  v_limit := CASE WHEN (now() AT TIME ZONE 'Europe/Paris')::date = DATE '2026-10-04' THEN 200 ELSE 4 END;

  SELECT COUNT(*) INTO v_count
  FROM public.captures
  WHERE user_id = NEW.user_id
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day';

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'DAILY_CAPTURE_LIMIT_REACHED'
      USING HINT = 'Limite de captures par jour atteinte.';
  END IF;

  RETURN NEW;
END;
$function$;