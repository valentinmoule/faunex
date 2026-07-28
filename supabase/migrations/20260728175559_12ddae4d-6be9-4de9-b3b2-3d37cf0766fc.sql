CREATE OR REPLACE FUNCTION public.match_animal(p_name text, p_scientific text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, scientific_name text, category text, rarity text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cfg AS (
    SELECT
      btrim(public.normalize_animal_label(p_name)) AS n_name,
      btrim(public.normalize_animal_label(p_scientific)) AS n_sci,
      -- Binômes partagés par de multiples races : la correspondance par nom
      -- scientifique y est ambiguë et ne doit pas être utilisée.
      btrim(public.normalize_animal_label(p_scientific)) = ANY (ARRAY[
        btrim(public.normalize_animal_label('Canis lupus familiaris')),
        btrim(public.normalize_animal_label('Canis familiaris')),
        btrim(public.normalize_animal_label('Felis catus')),
        btrim(public.normalize_animal_label('Felis silvestris catus')),
        btrim(public.normalize_animal_label('Equus caballus')),
        btrim(public.normalize_animal_label('Equus ferus caballus')),
        btrim(public.normalize_animal_label('Bos taurus')),
        btrim(public.normalize_animal_label('Ovis aries')),
        btrim(public.normalize_animal_label('Capra hircus')),
        btrim(public.normalize_animal_label('Sus scrofa domesticus')),
        btrim(public.normalize_animal_label('Gallus gallus domesticus')),
        btrim(public.normalize_animal_label('Oryctolagus cuniculus')),
        btrim(public.normalize_animal_label('Anas platyrhynchos domesticus')),
        btrim(public.normalize_animal_label('Columba livia domestica'))
      ]) AS sci_ambiguous
  )
  SELECT a.id, a.name, a.scientific_name, a.category, a.rarity
  FROM public.animals a, cfg
  WHERE btrim(public.normalize_animal_label(a.name)) = cfg.n_name
     OR (
        NOT cfg.sci_ambiguous
        AND p_scientific IS NOT NULL
        AND a.scientific_name IS NOT NULL
        AND btrim(public.normalize_animal_label(a.scientific_name)) = cfg.n_sci
     )
  ORDER BY (btrim(public.normalize_animal_label(a.name)) = cfg.n_name) DESC,
           a.created_at ASC
  LIMIT 1;
$function$;