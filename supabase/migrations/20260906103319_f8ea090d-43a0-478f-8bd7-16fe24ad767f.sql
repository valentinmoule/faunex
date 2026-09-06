UPDATE public.captures SET animal_name = 'Chien', scientific_name = 'Canis lupus familiaris'
WHERE animal_name = '??';
DELETE FROM public.animals WHERE name = '??';

UPDATE public.captures SET scientific_name = NULL WHERE scientific_name ILIKE '%inconnu%';
UPDATE public.animals SET scientific_name = NULL WHERE scientific_name ILIKE '%inconnu%';
UPDATE public.taxa SET scientific_name = NULL WHERE scientific_name ILIKE '%inconnu%';
UPDATE public.species_profiles SET scientific_name = NULL, normalized_scientific = NULL WHERE scientific_name ILIKE '%inconnu%';

CREATE OR REPLACE FUNCTION public.block_placeholder_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
  common_name text;
  sci_name text;
  bad text[] := ARRAY['inconnu','inconnue','unknown','??','?','n/a','na','none','null','-'];
BEGIN
  common_name := COALESCE(j->>'animal_name', j->>'name', j->>'vernacular_name');
  sci_name := j->>'scientific_name';

  IF common_name IS NOT NULL AND (
       btrim(common_name) = '' OR lower(btrim(common_name)) = ANY (bad)
     ) THEN
    RAISE EXCEPTION 'Nom commun invalide (%) : un nom d''espèce explicite est requis.', common_name;
  END IF;

  IF sci_name IS NOT NULL AND (
       lower(btrim(sci_name)) = ANY (bad) OR lower(sci_name) LIKE '%inconnu%' OR lower(sci_name) LIKE '%unknown%'
     ) THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('scientific_name', NULL));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_placeholder_names_captures ON public.captures;
CREATE TRIGGER block_placeholder_names_captures
BEFORE INSERT OR UPDATE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.block_placeholder_names();

DROP TRIGGER IF EXISTS block_placeholder_names_animals ON public.animals;
CREATE TRIGGER block_placeholder_names_animals
BEFORE INSERT OR UPDATE ON public.animals
FOR EACH ROW EXECUTE FUNCTION public.block_placeholder_names();

DROP TRIGGER IF EXISTS block_placeholder_names_taxa ON public.taxa;
CREATE TRIGGER block_placeholder_names_taxa
BEFORE INSERT OR UPDATE ON public.taxa
FOR EACH ROW EXECUTE FUNCTION public.block_placeholder_names();