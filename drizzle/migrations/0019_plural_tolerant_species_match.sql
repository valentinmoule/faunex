CREATE OR REPLACE FUNCTION public.singular_animal_label(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT nullif(btrim(regexp_replace(' ' || coalesce(public.normalize_animal_label(p),'') || ' ',
    '([a-z]{3,})(s|x) ', '\1 ', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.resolve_species_identity_plural(p_name text)
RETURNS TABLE(name text, scientific_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT x.n, x.s FROM (
    SELECT t.vernacular_name n, t.scientific_name s, 0 o, t.created_at c FROM public.taxa t
     WHERE t.merged_into IS NULL AND public.singular_animal_label(t.vernacular_name) = public.singular_animal_label(p_name)
    UNION ALL
    SELECT a.name, a.scientific_name, 1, a.created_at FROM public.animals a
     WHERE public.singular_animal_label(a.name) = public.singular_animal_label(p_name)
  ) x ORDER BY x.o, x.c LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  res record;
  pl record;
BEGIN
  IF TG_TABLE_NAME = 'captures' THEN
    NEW.animal_name := public.canonical_animal_name(NEW.animal_name);
    IF NEW.animal_name IS NOT NULL AND NEW.animal_name <> '' AND lower(NEW.animal_name) <> 'inconnu' THEN
      SELECT * INTO res FROM public.resolve_species_identity(NEW.animal_name, NEW.scientific_name);
      IF res.matched THEN
        NEW.animal_name := res.name;
        NEW.scientific_name := coalesce(res.scientific_name, NEW.scientific_name);
      ELSE
        SELECT * INTO pl FROM public.resolve_species_identity_plural(NEW.animal_name);
        IF pl.name IS NOT NULL THEN
          NEW.animal_name := pl.name;
          NEW.scientific_name := coalesce(pl.scientific_name, NEW.scientific_name);
        END IF;
      END IF;
    END IF;
  ELSE
    NEW.name := public.canonical_animal_name(NEW.name);
  END IF;
  RETURN NEW;
END;
$function$;