ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS species_number integer;

-- Numéro global fixé une fois : ordre d'apparition des fiches (création, puis id).
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.animals
)
UPDATE public.animals a
SET species_number = r.rn
FROM ranked r
WHERE a.id = r.id AND a.species_number IS NULL;

CREATE SEQUENCE IF NOT EXISTS public.animals_species_number_seq;
SELECT setval('public.animals_species_number_seq',
  (SELECT coalesce(max(species_number), 0) + 1 FROM public.animals), false);

CREATE UNIQUE INDEX IF NOT EXISTS animals_species_number_key ON public.animals (species_number);

-- Chaque nouvelle fiche reçoit le numéro suivant, automatiquement.
CREATE OR REPLACE FUNCTION public.assign_species_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.species_number IS NULL THEN
    NEW.species_number := nextval('public.animals_species_number_seq');
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS assign_species_number_trg ON public.animals;
CREATE TRIGGER assign_species_number_trg BEFORE INSERT ON public.animals
FOR EACH ROW EXECUTE FUNCTION public.assign_species_number();

-- Le numéro attribué ne change plus jamais, même si la fiche est renommée ou fusionnée.
CREATE OR REPLACE FUNCTION public.lock_species_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.species_number IS NOT NULL THEN
    NEW.species_number := OLD.species_number;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS lock_species_number_trg ON public.animals;
CREATE TRIGGER lock_species_number_trg BEFORE UPDATE ON public.animals
FOR EACH ROW EXECUTE FUNCTION public.lock_species_number();

GRANT USAGE, SELECT ON SEQUENCE public.animals_species_number_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.animals_species_number_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.animals_species_number_seq TO authenticated;