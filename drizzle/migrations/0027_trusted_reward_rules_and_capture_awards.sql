CREATE TABLE public.reward_security_rules (rule_key text PRIMARY KEY, definition jsonb NOT NULL);
GRANT ALL ON public.reward_security_rules TO service_role;
ALTER TABLE public.reward_security_rules ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.reward_security_rules IS 'Trusted mirror of existing badge and collection rules; not writable by clients.';
ALTER TABLE public.captures ADD COLUMN xp_awarded boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.xp_on_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_xp integer;
BEGIN
 IF TG_OP='INSERT' THEN NEW.xp_awarded:=false; ELSE NEW.xp_awarded:=OLD.xp_awarded; END IF;
 IF NEW.status <> 'approved' OR NEW.xp_awarded THEN RETURN NEW; END IF;
 v_xp:= CASE lower(coalesce(NEW.rarity,'common')) WHEN 'uncommon' THEN 75 WHEN 'rare' THEN 120 WHEN 'very_rare' THEN 160 WHEN 'ultra_rare' THEN 220 WHEN 'illustration_rare' THEN 300 WHEN 'special_rare' THEN 400 WHEN 'hyper_rare' THEN 550 WHEN 'epic' THEN 220 WHEN 'legendary' THEN 400 WHEN 'mythic' THEN 550 ELSE 50 END;
 NEW.xp_awarded:=true;
 PERFORM public.grant_xp(NEW.user_id,v_xp);
 RETURN NEW;
END $$;
DROP TRIGGER on_capture_xp ON public.captures;
CREATE TRIGGER zzz_capture_reward BEFORE INSERT OR UPDATE ON public.captures FOR EACH ROW EXECUTE FUNCTION public.xp_on_capture();
CREATE OR REPLACE FUNCTION public.grant_xp(p_user_id uuid,p_amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_xp integer; v_level integer; v_xp_to_next integer;
BEGIN
 IF p_amount IS NULL OR p_amount <= 0 THEN RETURN; END IF;
 SELECT xp,level,xp_to_next INTO v_xp,v_level,v_xp_to_next FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 v_xp:=v_xp+p_amount;
 WHILE v_xp >= v_xp_to_next LOOP
 v_xp:=v_xp-v_xp_to_next; v_level:=v_level+1;
 v_xp_to_next:=CASE WHEN v_level<=1 THEN 50 WHEN v_level=2 THEN 120 WHEN v_level=3 THEN 200 WHEN v_level=4 THEN 300 WHEN v_level=5 THEN 400 ELSE 400+(v_level-5)*100 END;
 END LOOP;
 UPDATE public.profiles SET xp=v_xp,level=v_level,xp_to_next=v_xp_to_next,updated_at=now() WHERE user_id=p_user_id;
 BEGIN PERFORM public.league_add_points(p_user_id,p_amount); EXCEPTION WHEN OTHERS THEN RAISE WARNING 'league_add_points failed'; END;
END $$;
REVOKE ALL ON FUNCTION public.grant_xp(uuid,integer),public.xp_on_capture() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_xp(uuid,integer),public.xp_on_capture() TO service_role;
CREATE OR REPLACE FUNCTION public.reward_normalize(p_text text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT btrim(regexp_replace(regexp_replace(regexp_replace(lower(normalize(coalesce(p_text,''),NFD)), U&'[\0300-\036f]', '', 'g'),'[’''-]',' ','g'),'\s+',' ','g')) $$;
CREATE OR REPLACE FUNCTION public.reward_species_group(p_name text,p_scientific text,p_category text) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE g jsonb; label text:=public.reward_normalize(coalesce(p_name,'')||' '||coalesce(p_scientific,''));
BEGIN
 FOR g IN SELECT value FROM public.reward_security_rules r,jsonb_array_elements(r.definition) WHERE r.rule_key='groups' LOOP
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(g->'scientificNames','[]')) s WHERE s.value=lower(btrim(coalesce(p_scientific,'')))) THEN RETURN g->>'key'; END IF;
 END LOOP;
 FOR g IN SELECT value FROM public.reward_security_rules r,jsonb_array_elements(r.definition) WHERE r.rule_key='groups' LOOP
 IF g->'keywords' IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(g->'categories') c WHERE starts_with(public.reward_normalize(p_category),public.reward_normalize(c.value))) AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(g->'keywords') k WHERE strpos(label,public.reward_normalize(k.value))>0) THEN RETURN g->>'key'; END IF;
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.reward_species_group(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reward_species_group(text,text,text) TO service_role;