CREATE OR REPLACE FUNCTION public.submit_contest_photo(p_capture_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE u uuid := auth.uid(); c public.captures%ROWTYPE; wk date := public.contest_week(); new_id uuid;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO c FROM public.captures WHERE id = p_capture_id;
  IF NOT FOUND OR c.user_id <> u THEN RAISE EXCEPTION 'not_owner'; END IF;
  IF c.status <> 'approved' THEN RAISE EXCEPTION 'not_approved'; END IF;
  IF EXISTS (SELECT 1 FROM public.photo_contest_entries WHERE capture_id = p_capture_id) THEN RAISE EXCEPTION 'already_entered'; END IF;
  IF public.contest_week(c.created_at) <> wk THEN RAISE EXCEPTION 'not_this_week'; END IF;
  IF EXISTS (SELECT 1 FROM public.photo_contest_entries WHERE user_id = u AND week_start = wk) THEN RAISE EXCEPTION 'already_submitted'; END IF;
  INSERT INTO public.photo_contest_entries(user_id, capture_id, week_start) VALUES (u, p_capture_id, wk) RETURNING id INTO new_id;
  RETURN new_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'already_submitted';
END $function$;