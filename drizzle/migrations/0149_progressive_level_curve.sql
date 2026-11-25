CREATE OR REPLACE FUNCTION public.xp_needed_for_level(p_level integer) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE WHEN p_level<=0 THEN 50 WHEN p_level=1 THEN 100 WHEN p_level=2 THEN 180 WHEN p_level=3 THEN 280 WHEN p_level=4 THEN 400 ELSE 400+(p_level-4)*125 END $$;
CREATE OR REPLACE FUNCTION public.grant_xp(p_user_id uuid,p_amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_xp integer; v_level integer; v_xp_to_next integer;
BEGIN
 IF p_amount IS NULL OR p_amount <= 0 THEN RETURN; END IF;
 SELECT xp,level,xp_to_next INTO v_xp,v_level,v_xp_to_next FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 v_xp:=v_xp+p_amount;
 WHILE v_xp >= v_xp_to_next LOOP
  v_xp:=v_xp-v_xp_to_next; v_level:=v_level+1;
  v_xp_to_next:=public.xp_needed_for_level(v_level);
 END LOOP;
 UPDATE public.profiles SET xp=v_xp,level=v_level,xp_to_next=v_xp_to_next,updated_at=now() WHERE user_id=p_user_id;
 BEGIN PERFORM public.league_add_points(p_user_id,p_amount); EXCEPTION WHEN OTHERS THEN RAISE WARNING 'league_add_points failed'; END;
END $$;
REVOKE ALL ON FUNCTION public.grant_xp(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_xp(uuid,integer) TO service_role;