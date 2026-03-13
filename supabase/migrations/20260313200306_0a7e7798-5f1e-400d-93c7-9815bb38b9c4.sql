
-- Set default level to 0 for new profiles
ALTER TABLE public.profiles ALTER COLUMN level SET DEFAULT 0;

-- Update existing profiles that are level 1 with 0 XP to level 0
UPDATE public.profiles SET level = 0 WHERE level = 1 AND xp = 0 AND total_captures = 0;

-- Update grant_xp to handle level 0 -> 1 with lower XP threshold
CREATE OR REPLACE FUNCTION public.grant_xp(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp integer;
  v_level integer;
  v_xp_to_next integer;
BEGIN
  SELECT xp, level, xp_to_next INTO v_xp, v_level, v_xp_to_next
  FROM public.profiles WHERE user_id = p_user_id;

  v_xp := v_xp + p_amount;

  -- Level up loop
  WHILE v_xp >= v_xp_to_next LOOP
    v_xp := v_xp - v_xp_to_next;
    v_level := v_level + 1;
    -- Level 0->1 needs only the initial xp_to_next (100), then scale
    IF v_level <= 1 THEN
      v_xp_to_next := 100;
    ELSE
      v_xp_to_next := 1000 + (v_level - 1) * 200;
    END IF;
  END LOOP;

  UPDATE public.profiles
  SET xp = v_xp, level = v_level, xp_to_next = v_xp_to_next, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Set xp_to_next to 100 for level 0 profiles so first capture levels them up
UPDATE public.profiles SET xp_to_next = 100 WHERE level = 0;
