CREATE OR REPLACE FUNCTION public.claim_badge(p_badge_id text, p_xp_reward integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_capped integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  IF p_badge_id = 'premium_member' AND NOT public.is_premium(v_user) THEN
    RETURN false;
  END IF;

  v_capped := CASE WHEN p_badge_id = 'premium_member' THEN 150
    ELSE LEAST(GREATEST(COALESCE(p_xp_reward, 0), 0), 500) END;

  INSERT INTO public.user_badges (user_id, badge_id, xp_reward)
  VALUES (v_user, p_badge_id, v_capped)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.grant_xp(v_user, v_capped);
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.claim_badge(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_badge(text, integer) TO authenticated;