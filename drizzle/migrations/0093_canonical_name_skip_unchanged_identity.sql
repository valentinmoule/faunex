CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE res record;
BEGIN
 IF TG_TABLE_NAME='captures' THEN
  -- Identity already accepted on this row: unrelated updates (e.g. economy binding) must not re-check it.
  IF TG_OP='UPDATE' AND NEW.animal_name IS NOT DISTINCT FROM OLD.animal_name AND NEW.scientific_name IS NOT DISTINCT FROM OLD.scientific_name THEN
   RETURN NEW;
  END IF;
  NEW.animal_name:=public.canonical_animal_name(NEW.animal_name);
  IF coalesce(NEW.animal_name,'')<>'' AND lower(NEW.animal_name)<>'inconnu' THEN
   BEGIN
    SELECT * INTO res FROM public.resolve_species_identity(NEW.animal_name,NEW.scientific_name);
    IF res.matched THEN NEW.animal_name:=res.name; NEW.scientific_name:=coalesce(res.scientific_name,NEW.scientific_name); END IF;
   EXCEPTION WHEN raise_exception THEN
    IF NOT public.identity_force_allowed() THEN RAISE; END IF;
   END;
  END IF;
 ELSE NEW.name:=public.canonical_animal_name(NEW.name);
 END IF;
 RETURN NEW;
END $function$;