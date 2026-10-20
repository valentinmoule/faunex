CREATE OR REPLACE FUNCTION public.species_profile_for(p_name text, p_scientific text DEFAULT NULL)
RETURNS TABLE(animal_name text, scientific_name text, description text, habitat text, diet text, conservation text, fun_fact text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT sp.animal_name,sp.scientific_name,sp.description,sp.habitat,sp.diet,sp.conservation,sp.fun_fact FROM public.species_profiles sp
 WHERE (sp.normalized_name=public.normalize_animal_label(p_name) OR (nullif(p_scientific,'') IS NOT NULL AND NOT public.is_shared_domestic_binomial(p_scientific) AND sp.normalized_scientific=public.normalize_animal_label(p_scientific)))
 AND public.species_profile_identity_matches(p_name,p_scientific,sp.animal_name,sp.scientific_name)
 ORDER BY (sp.normalized_name=public.normalize_animal_label(p_name)) DESC, sp.updated_at DESC LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.species_profile_en(p_name text, p_scientific text DEFAULT NULL)
RETURNS TABLE(description_en text, habitat_en text, diet_en text, fun_fact_en text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT sp.description_en,sp.habitat_en,sp.diet_en,sp.fun_fact_en FROM public.species_profiles sp
 WHERE sp.description_en IS NOT NULL AND (sp.normalized_name=public.normalize_animal_label(p_name) OR (nullif(p_scientific,'') IS NOT NULL AND NOT public.is_shared_domestic_binomial(p_scientific) AND sp.normalized_scientific=public.normalize_animal_label(p_scientific)))
 AND public.species_profile_identity_matches(p_name,p_scientific,sp.animal_name,sp.scientific_name)
 ORDER BY (sp.normalized_name=public.normalize_animal_label(p_name)) DESC, sp.updated_at DESC LIMIT 1;
$$;