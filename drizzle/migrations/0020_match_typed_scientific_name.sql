CREATE OR REPLACE FUNCTION public.resolve_species_identity_plural(p_name text)
RETURNS TABLE(name text, scientific_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT x.n, x.s FROM (
    SELECT t.vernacular_name n, t.scientific_name s, 0 o, t.created_at c FROM public.taxa t
     WHERE t.merged_into IS NULL AND public.singular_animal_label(t.vernacular_name) = public.singular_animal_label(p_name)
    UNION ALL
    SELECT a.name, a.scientific_name, 1, a.created_at FROM public.animals a
     WHERE public.singular_animal_label(a.name) = public.singular_animal_label(p_name)
    UNION ALL
    SELECT a.name, a.scientific_name, 2, a.created_at FROM public.animals a
     WHERE public.normalize_animal_label(a.scientific_name) = public.normalize_animal_label(p_name)
       AND public.normalize_animal_label(a.name) <> public.normalize_animal_label(a.scientific_name)
       AND (SELECT count(*) FROM public.animals b
            WHERE public.normalize_animal_label(b.scientific_name) = public.normalize_animal_label(p_name)) = 1
  ) x ORDER BY x.o, x.c LIMIT 1;
$$;