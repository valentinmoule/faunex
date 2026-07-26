CREATE OR REPLACE FUNCTION public.normalize_animal_label(p_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(
    regexp_replace(
      lower(translate(coalesce(p_label, ''),
        'àáâãäåāçčèéêëēėęìíîïīįñòóôõöøōùúûüūýÿšž',
        'aaaaaaaccceeeeeeeiiiiiinoooooooouuuuuyysz')),
      '[^a-z0-9]+', ' ', 'g'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.match_animal(p_name text, p_scientific text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, scientific_name text, category text, rarity text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name, a.scientific_name, a.category, a.rarity
  FROM public.animals a
  WHERE btrim(public.normalize_animal_label(a.name)) = btrim(public.normalize_animal_label(p_name))
     OR (
        p_scientific IS NOT NULL
        AND a.scientific_name IS NOT NULL
        AND btrim(public.normalize_animal_label(a.scientific_name)) = btrim(public.normalize_animal_label(p_scientific))
     )
  ORDER BY (btrim(public.normalize_animal_label(a.name)) = btrim(public.normalize_animal_label(p_name))) DESC,
           a.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.match_animal(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_animal_label(text) TO authenticated, service_role;