CREATE OR REPLACE FUNCTION public.resolve_species_identity(p_name text, p_scientific text)
RETURNS TABLE(name text, scientific_name text, matched boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name text := btrim(coalesce(public.strip_label_parenthetical(p_name), p_name, ''));
  v_sci  text := nullif(btrim(coalesce(p_scientific, '')), '');
  n_name text;
  n_sci  text;
  r_name text;
  r_sci  text;
  sci_ambiguous boolean := false;
BEGIN
  n_name := public.normalize_animal_label(v_name);
  n_sci  := public.normalize_animal_label(v_sci);

  IF n_name IS NULL AND n_sci IS NULL THEN
    RETURN QUERY SELECT p_name, p_scientific, false;
    RETURN;
  END IF;

  -- Nom latin ambigu (race domestique / groupe, ou porté par plusieurs fiches)
  IF n_sci IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.taxa t
      WHERE t.scientific_name IS NOT NULL
        AND public.normalize_animal_label(t.scientific_name) = n_sci
        AND (t.is_domestic OR t.rank = 'group')
    ) OR (
      SELECT count(*) > 1 FROM public.animals a
      WHERE a.scientific_name IS NOT NULL
        AND public.normalize_animal_label(a.scientific_name) = n_sci
    ) INTO sci_ambiguous;
  END IF;

  SELECT t.vernacular_name, coalesce(t.scientific_name, v_sci)
    INTO r_name, r_sci
  FROM public.taxa t
  WHERE t.merged_into IS NULL
    AND public.normalize_animal_label(t.vernacular_name) = n_name
  ORDER BY (t.status = 'validated') DESC, t.created_at ASC
  LIMIT 1;

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

  IF r_name IS NULL AND n_sci IS NOT NULL AND NOT sci_ambiguous THEN
    SELECT t.vernacular_name, coalesce(t.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.taxa t
    WHERE t.merged_into IS NULL
      AND t.scientific_name IS NOT NULL
      AND public.normalize_animal_label(t.scientific_name) = n_sci
    ORDER BY (t.status = 'validated') DESC, t.created_at ASC
    LIMIT 1;
  END IF;

  IF r_name IS NULL AND n_name IS NOT NULL THEN
    SELECT a.name, coalesce(a.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.animals a
    WHERE public.normalize_animal_label(a.name) = n_name
    ORDER BY a.created_at ASC
    LIMIT 1;
  END IF;

  IF r_name IS NULL AND n_sci IS NOT NULL AND NOT sci_ambiguous THEN
    SELECT a.name, coalesce(a.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.animals a
    WHERE a.scientific_name IS NOT NULL
      AND public.normalize_animal_label(a.scientific_name) = n_sci
    ORDER BY a.created_at ASC
    LIMIT 1;
  END IF;

  IF r_name IS NULL AND n_name IS NOT NULL AND length(n_name) >= 5 THEN
    SELECT t.vernacular_name, coalesce(t.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.taxa t
    WHERE t.merged_into IS NULL
      AND left(public.normalize_animal_label(t.vernacular_name), 3) = left(n_name, 3)
      AND abs(length(public.normalize_animal_label(t.vernacular_name)) - length(n_name)) <= 2
      AND extensions.similarity(public.normalize_animal_label(t.vernacular_name), n_name) >= 0.78
    ORDER BY extensions.similarity(public.normalize_animal_label(t.vernacular_name), n_name) DESC,
             (t.status = 'validated') DESC
    LIMIT 1;
  END IF;

  IF r_name IS NULL AND n_name IS NOT NULL AND length(n_name) >= 5 THEN
    SELECT a.name, coalesce(a.scientific_name, v_sci)
      INTO r_name, r_sci
    FROM public.animals a
    WHERE left(public.normalize_animal_label(a.name), 3) = left(n_name, 3)
      AND abs(length(public.normalize_animal_label(a.name)) - length(n_name)) <= 2
      AND extensions.similarity(public.normalize_animal_label(a.name), n_name) >= 0.78
    ORDER BY extensions.similarity(public.normalize_animal_label(a.name), n_name) DESC
    LIMIT 1;
  END IF;

  IF r_name IS NULL THEN
    RETURN QUERY SELECT v_name, v_sci, false;
  ELSE
    RETURN QUERY SELECT r_name, r_sci, true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_species_identity(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_species_identity(text, text) TO service_role;