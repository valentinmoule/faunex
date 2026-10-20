CREATE OR REPLACE FUNCTION public.species_profile_identity_matches(p_name text, p_scientific text, p_profile_name text, p_profile_scientific text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT (public.normalize_animal_label(p_name) = public.normalize_animal_label(p_profile_name)
 AND (nullif(public.normalize_animal_label(p_scientific),'') IS NULL OR nullif(public.normalize_animal_label(p_profile_scientific),'') IS NULL OR public.normalize_animal_label(p_scientific)=public.normalize_animal_label(p_profile_scientific)))
 OR (nullif(public.normalize_animal_label(p_scientific),'') IS NOT NULL AND NOT public.is_shared_domestic_binomial(p_scientific) AND public.normalize_animal_label(p_scientific)=public.normalize_animal_label(p_profile_scientific));
$$;
CREATE OR REPLACE FUNCTION public.species_profile_for(p_name text, p_scientific text DEFAULT NULL)
RETURNS TABLE(animal_name text, scientific_name text, description text, habitat text, diet text, conservation text, fun_fact text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT sp.animal_name,sp.scientific_name,sp.description,sp.habitat,sp.diet,sp.conservation,sp.fun_fact FROM public.species_profiles sp
 WHERE public.species_profile_identity_matches(p_name,p_scientific,sp.animal_name,sp.scientific_name)
 ORDER BY (sp.normalized_name=public.normalize_animal_label(p_name)) DESC, sp.updated_at DESC LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.species_profile_en(p_name text, p_scientific text DEFAULT NULL)
RETURNS TABLE(description_en text, habitat_en text, diet_en text, fun_fact_en text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT sp.description_en,sp.habitat_en,sp.diet_en,sp.fun_fact_en FROM public.species_profiles sp
 WHERE sp.description_en IS NOT NULL AND public.species_profile_identity_matches(p_name,p_scientific,sp.animal_name,sp.scientific_name)
 ORDER BY (sp.normalized_name=public.normalize_animal_label(p_name)) DESC, sp.updated_at DESC LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.guard_species_profile_description()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF (TG_OP='INSERT' OR NEW.description IS DISTINCT FROM OLD.description) AND public.profile_mentions_other_species(NEW.animal_name,NEW.description) THEN
 RAISE EXCEPTION 'SPECIES_PROFILE_DESCRIPTION_MISMATCH';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.description,NEW.habitat,NEW.diet,NEW.fun_fact,NEW.scientific_name) IS DISTINCT FROM (OLD.description,OLD.habitat,OLD.diet,OLD.fun_fact,OLD.scientific_name) THEN
 NEW.description_en:=NULL; NEW.habitat_en:=NULL; NEW.diet_en:=NULL; NEW.fun_fact_en:=NULL; NEW.translated_en_at:=NULL;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_species_profile_description BEFORE INSERT OR UPDATE ON public.species_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_species_profile_description();
CREATE OR REPLACE FUNCTION public.attach_canonical_capture_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
 IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
 SELECT * INTO p FROM public.species_profile_for(NEW.animal_name,NEW.scientific_name);
 IF p.description IS NOT NULL AND NOT public.profile_mentions_other_species(NEW.animal_name,p.description) THEN
 NEW.description:=p.description; NEW.habitat:=p.habitat; NEW.diet:=p.diet; NEW.conservation:=p.conservation; NEW.fun_fact:=p.fun_fact;
 ELSIF public.profile_mentions_other_species(NEW.animal_name,NEW.description) THEN
 NEW.description:=NULL; NEW.habitat:=NULL; NEW.diet:=NULL; NEW.conservation:=NULL; NEW.fun_fact:=NULL;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER zzz_attach_canonical_capture_profile BEFORE INSERT OR UPDATE OF animal_name,scientific_name,status,description,habitat,diet,conservation,fun_fact ON public.captures FOR EACH ROW EXECUTE FUNCTION public.attach_canonical_capture_profile();
REVOKE ALL ON FUNCTION public.guard_species_profile_description(),public.attach_canonical_capture_profile() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_species_profile_description(),public.attach_canonical_capture_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.species_profile_identity_matches(text,text,text,text) TO authenticated,service_role;