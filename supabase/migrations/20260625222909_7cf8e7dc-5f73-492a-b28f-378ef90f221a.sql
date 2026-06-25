
CREATE OR REPLACE FUNCTION public.claim_badge(p_badge_id text, p_xp_reward integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_capped integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  -- Cap the XP reward server-side (clients can't grant themselves arbitrary XP).
  v_capped := LEAST(GREATEST(COALESCE(p_xp_reward, 0), 0), 500);

  -- Idempotent insert; if the badge was already claimed we skip the XP grant.
  INSERT INTO public.user_badges (user_id, badge_id, xp_reward)
  VALUES (v_user, p_badge_id, v_capped)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.grant_xp(v_user, v_capped);
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_badge(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_badge(text, integer) TO authenticated;
