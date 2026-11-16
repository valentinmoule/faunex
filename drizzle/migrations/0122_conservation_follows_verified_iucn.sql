CREATE OR REPLACE FUNCTION public.conservation_code(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT upper(substring(coalesce(p_text,'') from '\m(EX|EW|CR|EN|VU|NT|LC|DD|NE)\M'))
$$;

-- Statut UICN vérifié d'une tuile (sync GBIF), hors « non évalué ».
CREATE OR REPLACE FUNCTION public.verified_iucn_status(p_name text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT upper(a.iucn_status) FROM public.animals a
  WHERE lower(a.name) = lower(btrim(coalesce(p_name,'')))
    AND upper(a.iucn_status) IN ('LC','NT','VU','EN','CR','EW','EX','DD')
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.verified_iucn_status(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.attach_canonical_capture_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p record; v text;
BEGIN
 IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
 SELECT * INTO p FROM public.species_profile_for(NEW.animal_name,NEW.scientific_name);
 IF p.description IS NOT NULL AND NOT public.profile_mentions_other_species(NEW.animal_name,p.description) THEN
 NEW.description:=p.description; NEW.habitat:=p.habitat; NEW.diet:=p.diet; NEW.conservation:=p.conservation; NEW.fun_fact:=p.fun_fact;
 ELSIF public.profile_mentions_other_species(NEW.animal_name,NEW.description) THEN
 NEW.description:=NULL; NEW.habitat:=NULL; NEW.diet:=NULL; NEW.conservation:=NULL; NEW.fun_fact:=NULL;
 END IF;
 -- Le statut affiché suit le statut UICN vérifié (base de la rareté).
 v := public.verified_iucn_status(NEW.animal_name);
 IF v IS NOT NULL AND public.conservation_code(NEW.conservation) IS DISTINCT FROM v THEN
   NEW.conservation := v;
 END IF;
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.align_profile_conservation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v text;
BEGIN
  v := public.verified_iucn_status(NEW.animal_name);
  IF v IS NOT NULL AND public.conservation_code(NEW.conservation) IS DISTINCT FROM v THEN
    NEW.conservation := v;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_align_profile_conservation ON public.species_profiles;
CREATE TRIGGER zz_align_profile_conservation
BEFORE INSERT OR UPDATE OF conservation, animal_name ON public.species_profiles
FOR EACH ROW EXECUTE FUNCTION public.align_profile_conservation();

CREATE OR REPLACE FUNCTION public.propagate_iucn_to_conservation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v text;
BEGIN
  v := public.verified_iucn_status(NEW.name);
  IF v IS NULL THEN RETURN NULL; END IF;
  UPDATE public.species_profiles sp SET conservation = v
   WHERE lower(sp.animal_name) = lower(NEW.name)
     AND public.conservation_code(sp.conservation) IS DISTINCT FROM v;
  UPDATE public.captures c SET conservation = v
   WHERE lower(c.animal_name) = lower(NEW.name) AND c.status = 'approved'
     AND public.conservation_code(c.conservation) IS DISTINCT FROM v;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS zz_propagate_iucn_to_conservation ON public.animals;
CREATE TRIGGER zz_propagate_iucn_to_conservation
AFTER UPDATE OF iucn_status ON public.animals
FOR EACH ROW WHEN (OLD.iucn_status IS DISTINCT FROM NEW.iucn_status)
EXECUTE FUNCTION public.propagate_iucn_to_conservation();

-- Backfill des descriptions d'espèces.
UPDATE public.species_profiles sp SET conservation = upper(a.iucn_status)
FROM public.animals a
WHERE lower(a.name) = lower(sp.animal_name)
  AND upper(a.iucn_status) IN ('LC','NT','VU','EN','CR','EW','EX','DD')
  AND public.conservation_code(sp.conservation) IS DISTINCT FROM upper(a.iucn_status);