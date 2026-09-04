CREATE OR REPLACE FUNCTION public.block_human_species()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name text := lower(coalesce(NEW.animal_name, ''));
  v_sci text := lower(coalesce(NEW.scientific_name, ''));
BEGIN
  IF TG_TABLE_NAME = 'animals' THEN
    v_name := lower(coalesce(NEW.name, ''));
  ELSIF TG_TABLE_NAME = 'taxa' THEN
    v_name := lower(coalesce(NEW.vernacular_name, ''));
  END IF;

  IF v_sci LIKE 'homo sapiens%'
     OR v_name IN ('humain', 'être humain', 'etre humain', 'homme', 'human', 'human being', 'person', 'personne')
  THEN
    RAISE EXCEPTION 'Les êtres humains ne peuvent pas être enregistrés comme espèce.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_human_species_captures ON public.captures;
CREATE TRIGGER block_human_species_captures
BEFORE INSERT OR UPDATE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.block_human_species();

DROP TRIGGER IF EXISTS block_human_species_animals ON public.animals;
CREATE TRIGGER block_human_species_animals
BEFORE INSERT OR UPDATE ON public.animals
FOR EACH ROW EXECUTE FUNCTION public.block_human_species();

DROP TRIGGER IF EXISTS block_human_species_taxa ON public.taxa;
CREATE TRIGGER block_human_species_taxa
BEFORE INSERT OR UPDATE ON public.taxa
FOR EACH ROW EXECUTE FUNCTION public.block_human_species();