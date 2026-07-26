-- Unifier le compteur: une seule colonne total_captures
CREATE OR REPLACE FUNCTION public.recompute_profile_counters(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.captures
  WHERE user_id = p_user_id AND status = 'approved';

  UPDATE public.profiles
  SET total_captures = COALESCE(v_total, 0),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.xp_on_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_xp integer;
  v_capture_count integer;
  v_bonus integer := 0;
BEGIN
  CASE NEW.rarity
    WHEN 'common' THEN v_xp := 60;
    WHEN 'rare' THEN v_xp := 150;
    WHEN 'epic' THEN v_xp := 300;
    WHEN 'mythic' THEN v_xp := 600;
    ELSE v_xp := 60;
  END CASE;

  SELECT COUNT(*) INTO v_capture_count
  FROM public.captures
  WHERE user_id = NEW.user_id AND status = 'approved';

  IF v_capture_count > 0 AND v_capture_count % 5 = 0 THEN
    v_bonus := 100;
  END IF;

  PERFORM public.grant_xp(NEW.user_id, v_xp + v_bonus);
  RETURN NEW;
END;
$function$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS species_count;

-- Resynchroniser tous les profils
UPDATE public.profiles p
SET total_captures = COALESCE(sub.c, 0), updated_at = now()
FROM (
  SELECT user_id, COUNT(*) AS c FROM public.captures WHERE status = 'approved' GROUP BY user_id
) sub
WHERE p.user_id = sub.user_id AND p.total_captures IS DISTINCT FROM sub.c;

UPDATE public.profiles p
SET total_captures = 0, updated_at = now()
WHERE p.total_captures <> 0
  AND NOT EXISTS (SELECT 1 FROM public.captures c WHERE c.user_id = p.user_id AND c.status = 'approved');