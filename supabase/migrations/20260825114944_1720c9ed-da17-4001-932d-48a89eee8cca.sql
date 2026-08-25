CREATE OR REPLACE FUNCTION public.strip_label_parenthetical(p_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(
    btrim(regexp_replace(
      regexp_replace(coalesce(p_label, ''), '\s*\([^)]*\)', '', 'g'),
      '\s{2,}', ' ', 'g'
    )),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.canonical_animal_name(p_name text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH cleaned AS (
    SELECT coalesce(public.strip_label_parenthetical(p_name), p_name) AS n
  )
  SELECT COALESCE(
    (SELECT m.new_name FROM public.animal_merge_map m, cleaned c
      WHERE public.normalize_animal_label(m.old_name) IN (
              public.normalize_animal_label(p_name),
              public.normalize_animal_label(c.n))
      LIMIT 1),
    (SELECT n FROM cleaned)
  );
$$;