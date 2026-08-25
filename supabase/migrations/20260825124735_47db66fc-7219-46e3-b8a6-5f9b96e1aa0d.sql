CREATE OR REPLACE FUNCTION public.upsert_species_profile(
  p_name text,
  p_scientific text,
  p_description text,
  p_habitat text,
  p_diet text,
  p_conservation text,
  p_fun_fact text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text := public.normalize_animal_label(p_name);
BEGIN
  IF v_norm IS NULL OR v_norm = '' OR p_description IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.species_profiles (
    normalized_name, animal_name, scientific_name, normalized_scientific,
    description, habitat, diet, conservation, fun_fact, source
  ) VALUES (
    v_norm, p_name, p_scientific, public.normalize_animal_label(p_scientific),
    p_description, p_habitat, p_diet, p_conservation, p_fun_fact, 'ai'
  )
  ON CONFLICT (normalized_name) DO UPDATE
  SET description = COALESCE(public.species_profiles.description, EXCLUDED.description),
      habitat = COALESCE(public.species_profiles.habitat, EXCLUDED.habitat),
      diet = COALESCE(public.species_profiles.diet, EXCLUDED.diet),
      conservation = COALESCE(public.species_profiles.conservation, EXCLUDED.conservation),
      fun_fact = COALESCE(public.species_profiles.fun_fact, EXCLUDED.fun_fact),
      scientific_name = COALESCE(public.species_profiles.scientific_name, EXCLUDED.scientific_name),
      normalized_scientific = COALESCE(public.species_profiles.normalized_scientific, EXCLUDED.normalized_scientific),
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_species_profile(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_species_profile(text, text, text, text, text, text, text) TO service_role;