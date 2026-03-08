
-- Function to grant XP and handle level-up
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

  -- Level up loop (in case of large XP gains)
  WHILE v_xp >= v_xp_to_next LOOP
    v_xp := v_xp - v_xp_to_next;
    v_level := v_level + 1;
    -- Scale XP needed: 1000 base + 200 per level
    v_xp_to_next := 1000 + (v_level - 1) * 200;
  END LOOP;

  UPDATE public.profiles
  SET xp = v_xp, level = v_level, xp_to_next = v_xp_to_next, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- XP on new capture based on rarity
CREATE OR REPLACE FUNCTION public.xp_on_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer;
BEGIN
  CASE NEW.rarity
    WHEN 'common' THEN v_xp := 50;
    WHEN 'uncommon' THEN v_xp := 75;
    WHEN 'rare' THEN v_xp := 120;
    WHEN 'epic' THEN v_xp := 200;
    WHEN 'legendary' THEN v_xp := 350;
    WHEN 'mythic' THEN v_xp := 500;
    ELSE v_xp := 50;
  END CASE;

  PERFORM public.grant_xp(NEW.user_id, v_xp);
  RETURN NEW;
END;
$$;

-- XP on friend accepted
CREATE OR REPLACE FUNCTION public.xp_on_friend_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Both users get XP
    PERFORM public.grant_xp(NEW.requester_id, 20);
    PERFORM public.grant_xp(NEW.addressee_id, 20);
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER on_capture_xp
  AFTER INSERT ON public.captures
  FOR EACH ROW
  EXECUTE FUNCTION public.xp_on_capture();

CREATE TRIGGER on_friend_accepted_xp
  AFTER UPDATE ON public.explorer_friends
  FOR EACH ROW
  EXECUTE FUNCTION public.xp_on_friend_accepted();
