CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Résout un couple (nom commun, nom scientifique) vers une espèce déjà connue.
-- Retourne matched = false si rien de fiable n'existe (=> création légitime).
CREATE OR REPLACE FUNCTION public.resolve_species_identity(p_name text, p_scientific text)
RETURNS TABLE(name text, scientific_name text, matched boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := btrim(coalesce(public.strip_label_parenthetical(p_name), p_name, ''));
  v_sci  text := nullif(btrim(coalesce(p_scientific, '')), '');
  n_name text;
  n_sci  text;
  r_name text;
  r_sci  text;
BEGIN
  n_name := public.normalize_animal_label(v_name);
  n_sci  := public.normalize_animal_label(v_sci);

  IF n_name IS NULL AND n_sci IS NULL THEN
    RETURN QUERY SELECT p_name, p_scientific, false;
    RETURN;
  END IF;

  -- 1) Nom vernaculaire exact (normalisé) dans le référentiel taxonomique
  SELECT t.vernacular_name, coalesce(t.scientific_name, v_sci)
    INTO r_name, r_sci
  FROM public.taxa t
  WHERE t.merged_into IS NULL
    AND public.normalize_animal_label(t.vernacular_name) = n_name
  ORDER BY (t.status = 'validated') DESC, t.created_at ASC
  LIMIT 1;

  -- 2) Synonyme connu
  IF r_name IS NULL AND n_name IS NOT NULL THEN
    SELECT t.vernacular_name, coalesce(t.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.taxon_synonyms s
    JOIN public.taxa t ON t.id = s.taxon_id
    WHERE t.merged_into IS NULL
      AND public.normalize_animal_label(s.label) = n_name
    ORDER BY (t.status = 'validated') DESC, t.created_at ASC
    LIMIT 1;
  END IF;

  -- 3) Nom scientifique exact
  IF r_name IS NULL AND n_sci IS NOT NULL THEN
    SELECT t.vernacular_name, coalesce(t.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.taxa t
    WHERE t.merged_into IS NULL
      AND t.scientific_name IS NOT NULL
      AND public.normalize_animal_label(t.scientific_name) = n_sci
      AND NOT (t.is_domestic OR t.rank = 'group')
    ORDER BY (t.status = 'validated') DESC, t.created_at ASC
    LIMIT 1;
  END IF;

  -- 4) Table animals : nom exact
  IF r_name IS NULL AND n_name IS NOT NULL THEN
    SELECT a.name, coalesce(a.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.animals a
    WHERE public.normalize_animal_label(a.name) = n_name
    ORDER BY a.created_at ASC
    LIMIT 1;
  END IF;

  -- 5) Table animals : nom scientifique exact (non ambigu)
  IF r_name IS NULL AND n_sci IS NOT NULL THEN
    SELECT a.name, coalesce(a.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.animals a
    WHERE a.scientific_name IS NOT NULL
      AND public.normalize_animal_label(a.scientific_name) = n_sci
    ORDER BY a.created_at ASC
    LIMIT 1;
  END IF;

  -- 6) Fautes d'orthographe : similarité trigramme élevée sur le nom vernaculaire
  IF r_name IS NULL AND n_name IS NOT NULL AND length(n_name) >= 5 THEN
    SELECT t.vernacular_name, coalesce(t.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.taxa t
    WHERE t.merged_into IS NULL
      AND left(public.normalize_animal_label(t.vernacular_name), 3) = left(n_name, 3)
      AND public.similarity(public.normalize_animal_label(t.vernacular_name), n_name) >= 0.86
    ORDER BY public.similarity(public.normalize_animal_label(t.vernacular_name), n_name) DESC,
             (t.status = 'validated') DESC
    LIMIT 1;
  END IF;

  IF r_name IS NULL AND n_name IS NOT NULL AND length(n_name) >= 5 THEN
    SELECT a.name, coalesce(a.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.animals a
    WHERE left(public.normalize_animal_label(a.name), 3) = left(n_name, 3)
      AND public.similarity(public.normalize_animal_label(a.name), n_name) >= 0.86
    ORDER BY public.similarity(public.normalize_animal_label(a.name), n_name) DESC
    LIMIT 1;
  END IF;

  IF r_name IS NULL THEN
    RETURN QUERY SELECT v_name, v_sci, false;
  ELSE
    RETURN QUERY SELECT r_name, r_sci, true;
  END IF;
END;
$$;

-- Le trigger de canonisation réutilise désormais une espèce existante quand elle existe.
CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res record;
BEGIN
  IF TG_TABLE_NAME = 'captures' THEN
    NEW.animal_name := public.canonical_animal_name(NEW.animal_name);
    IF NEW.animal_name IS NOT NULL
       AND NEW.animal_name <> ''
       AND lower(NEW.animal_name) <> 'inconnu' THEN
      SELECT * INTO res
      FROM public.resolve_species_identity(NEW.animal_name, NEW.scientific_name);
      IF res.matched THEN
        NEW.animal_name := res.name;
        NEW.scientific_name := coalesce(res.scientific_name, NEW.scientific_name);
      END IF;
    END IF;
  ELSE
    NEW.name := public.canonical_animal_name(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;