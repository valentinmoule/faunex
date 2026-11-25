DROP INDEX IF EXISTS public.captures_unique_species_per_user;
CREATE INDEX IF NOT EXISTS captures_user_species_idx ON public.captures (user_id, lower(btrim(animal_name))) WHERE status = 'approved';

CREATE OR REPLACE FUNCTION public.xp_on_capture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_xp integer;
BEGIN
 IF TG_OP='INSERT' THEN NEW.xp_awarded:=false; ELSE NEW.xp_awarded:=OLD.xp_awarded; END IF;
 IF NEW.status <> 'approved' OR NEW.xp_awarded THEN RETURN NEW; END IF;
 IF EXISTS (
   SELECT 1 FROM public.captures c
   WHERE c.user_id = NEW.user_id AND c.id <> NEW.id AND c.status = 'approved'
     AND lower(btrim(c.animal_name)) = lower(btrim(NEW.animal_name))
 ) THEN
   v_xp := 15;
 ELSE
   v_xp:= CASE lower(coalesce(NEW.rarity,'common')) WHEN 'uncommon' THEN 75 WHEN 'rare' THEN 120 WHEN 'very_rare' THEN 160 WHEN 'ultra_rare' THEN 220 WHEN 'illustration_rare' THEN 300 WHEN 'special_rare' THEN 400 WHEN 'hyper_rare' THEN 550 WHEN 'epic' THEN 220 WHEN 'legendary' THEN 400 WHEN 'mythic' THEN 550 ELSE 50 END;
 END IF;
 NEW.xp_awarded:=true;
 PERFORM public.grant_xp(NEW.user_id,v_xp);
 RETURN NEW;
END $$;