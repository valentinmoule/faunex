-- keep the alias map as the single source of truth for merged names
COMMENT ON TABLE public.animal_merge_map IS 'Anciens noms d''animaux fusionnés vers leur nom canonique (anti-doublons)';

CREATE OR REPLACE FUNCTION public.canonical_animal_name(p_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT m.new_name FROM public.animal_merge_map m
      WHERE public.normalize_animal_label(m.old_name) = public.normalize_animal_label(p_name)
      LIMIT 1),
    p_name
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'captures' THEN
    NEW.animal_name := public.canonical_animal_name(NEW.animal_name);
  ELSE
    NEW.name := public.canonical_animal_name(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.canonical_animal_name(text) FROM anon;
REVOKE ALL ON FUNCTION public.enforce_canonical_animal_name() FROM anon, authenticated;

DROP TRIGGER IF EXISTS enforce_canonical_capture_name ON public.captures;
CREATE TRIGGER enforce_canonical_capture_name
  BEFORE INSERT OR UPDATE ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.enforce_canonical_animal_name();

DROP TRIGGER IF EXISTS enforce_canonical_animal_name_trg ON public.animals;
CREATE TRIGGER enforce_canonical_animal_name_trg
  BEFORE INSERT OR UPDATE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_canonical_animal_name();