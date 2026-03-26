
-- Rework grant_xp for faster progression
CREATE OR REPLACE FUNCTION public.grant_xp(p_user_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer;
  v_level integer;
  v_xp_to_next integer;
BEGIN
  SELECT xp, level, xp_to_next INTO v_xp, v_level, v_xp_to_next
  FROM public.profiles WHERE user_id = p_user_id;

  v_xp := v_xp + p_amount;

  -- Level up loop with fast early progression
  WHILE v_xp >= v_xp_to_next LOOP
    v_xp := v_xp - v_xp_to_next;
    v_level := v_level + 1;
    -- Fast early levels, then gradual scaling
    CASE
      WHEN v_level <= 1 THEN v_xp_to_next := 50;    -- 1 capture
      WHEN v_level = 2 THEN v_xp_to_next := 120;     -- ~3 captures
      WHEN v_level = 3 THEN v_xp_to_next := 200;
      WHEN v_level = 4 THEN v_xp_to_next := 300;
      WHEN v_level = 5 THEN v_xp_to_next := 400;
      ELSE v_xp_to_next := 400 + (v_level - 5) * 100;
    END CASE;
  END LOOP;

  UPDATE public.profiles
  SET xp = v_xp, level = v_level, xp_to_next = v_xp_to_next, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Rework XP on capture with higher rewards
CREATE OR REPLACE FUNCTION public.xp_on_capture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer;
  v_species_count integer;
  v_bonus integer := 0;
BEGIN
  -- Base XP by rarity
  CASE NEW.rarity
    WHEN 'common' THEN v_xp := 60;
    WHEN 'rare' THEN v_xp := 150;
    WHEN 'epic' THEN v_xp := 300;
    WHEN 'mythic' THEN v_xp := 600;
    ELSE v_xp := 60;
  END CASE;

  -- Collection milestone bonus: every 5 species = +100 XP
  SELECT COUNT(DISTINCT animal_name) INTO v_species_count
  FROM public.captures
  WHERE user_id = NEW.user_id AND status = 'approved';

  IF v_species_count > 0 AND v_species_count % 5 = 0 THEN
    v_bonus := 100;
  END IF;

  -- Update profile stats
  UPDATE public.profiles
  SET total_captures = total_captures + 1,
      species_count = v_species_count,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  PERFORM public.grant_xp(NEW.user_id, v_xp + v_bonus);
  RETURN NEW;
END;
$$;

-- Fix xp_to_next for existing level 0 users so first capture triggers level 1
UPDATE public.profiles SET xp_to_next = 50 WHERE level = 0;
