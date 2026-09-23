CREATE OR REPLACE FUNCTION public.species_profile_for(p_name text, p_scientific text DEFAULT NULL::text)
 RETURNS TABLE(animal_name text, scientific_name text, description text, habitat text, diet text, conservation text, fun_fact text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sp.animal_name, sp.scientific_name, sp.description, sp.habitat, sp.diet, sp.conservation, sp.fun_fact
  FROM public.species_profiles sp
  WHERE sp.normalized_name = public.normalize_animal_label(p_name)
     OR (
       p_scientific IS NOT NULL
       AND public.normalize_animal_label(p_scientific) <> ''
       AND NOT public.is_shared_domestic_binomial(p_scientific)
       AND sp.normalized_scientific = public.normalize_animal_label(p_scientific)
     )
  ORDER BY (sp.normalized_name = public.normalize_animal_label(p_name)) DESC
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.species_profile_en(p_name text, p_scientific text DEFAULT NULL::text)
 RETURNS TABLE(description_en text, habitat_en text, diet_en text, fun_fact_en text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sp.description_en, sp.habitat_en, sp.diet_en, sp.fun_fact_en
  FROM public.species_profiles sp
  WHERE sp.description_en IS NOT NULL
    AND (
      sp.normalized_name = public.normalize_animal_label(p_name)
      OR (
        p_scientific IS NOT NULL AND p_scientific <> ''
        AND NOT public.is_shared_domestic_binomial(p_scientific)
        AND sp.normalized_scientific = public.normalize_animal_label(p_scientific)
      )
    )
  ORDER BY (sp.normalized_name = public.normalize_animal_label(p_name)) DESC,
           sp.updated_at DESC
  LIMIT 1
$function$;

-- Clear captures that inherited the American Water Spaniel text from the shared dog binomial
UPDATE public.captures c
SET description = NULL, habitat = NULL, diet = NULL, fun_fact = NULL
WHERE c.animal_name NOT ILIKE '%pagneul%'
  AND (c.description ILIKE '%pagneul d%eau%' OR c.fun_fact ILIKE '%pagneul d%eau%' OR c.habitat ILIKE '%pagneul d%eau%');