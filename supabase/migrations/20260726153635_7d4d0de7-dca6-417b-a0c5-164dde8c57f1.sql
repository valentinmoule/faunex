CREATE OR REPLACE FUNCTION public.recompute_profile_counters(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(DISTINCT lower(animal_name)) INTO v_total
  FROM public.captures
  WHERE user_id = p_user_id AND status = 'approved';

  UPDATE public.profiles
  SET total_captures = COALESCE(v_total, 0),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

UPDATE public.profiles p
SET total_captures = COALESCE((
  SELECT COUNT(DISTINCT lower(c.animal_name))
  FROM public.captures c
  WHERE c.user_id = p.user_id AND c.status = 'approved'
), 0),
updated_at = now();