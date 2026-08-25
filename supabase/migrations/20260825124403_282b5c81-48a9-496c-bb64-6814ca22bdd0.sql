CREATE TABLE public.species_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  normalized_name text NOT NULL UNIQUE,
  animal_name text NOT NULL,
  scientific_name text,
  normalized_scientific text,
  description text,
  habitat text,
  diet text,
  conservation text,
  fun_fact text,
  source text NOT NULL DEFAULT 'ai',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_species_profiles_norm_sci ON public.species_profiles (normalized_scientific);

GRANT SELECT ON public.species_profiles TO authenticated;
GRANT SELECT ON public.species_profiles TO anon;
GRANT ALL ON public.species_profiles TO service_role;

ALTER TABLE public.species_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Species profiles are readable by everyone"
ON public.species_profiles FOR SELECT
USING (true);

CREATE TRIGGER update_species_profiles_updated_at
BEFORE UPDATE ON public.species_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Amorçage : on récupère la fiche la plus complète déjà rédigée pour chaque espèce.
INSERT INTO public.species_profiles (
  normalized_name, animal_name, scientific_name, normalized_scientific,
  description, habitat, diet, conservation, fun_fact, source
)
SELECT DISTINCT ON (public.normalize_animal_label(c.animal_name))
  public.normalize_animal_label(c.animal_name),
  c.animal_name,
  c.scientific_name,
  public.normalize_animal_label(c.scientific_name),
  c.description,
  c.habitat,
  c.diet,
  c.conservation,
  c.fun_fact,
  'seed'
FROM public.captures c
WHERE c.animal_name IS NOT NULL
  AND public.normalize_animal_label(c.animal_name) <> ''
  AND c.description IS NOT NULL
  AND length(c.description) > 60
  AND c.habitat IS NOT NULL
  AND c.diet IS NOT NULL
ORDER BY
  public.normalize_animal_label(c.animal_name),
  (length(coalesce(c.description,'')) + length(coalesce(c.habitat,'')) + length(coalesce(c.diet,'')) + length(coalesce(c.fun_fact,''))) DESC,
  c.created_at DESC
ON CONFLICT (normalized_name) DO NOTHING;

-- Lecture d'une fiche par nom français ou nom scientifique.
CREATE OR REPLACE FUNCTION public.species_profile_for(p_name text, p_scientific text DEFAULT NULL)
RETURNS TABLE(
  animal_name text,
  scientific_name text,
  description text,
  habitat text,
  diet text,
  conservation text,
  fun_fact text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.animal_name, sp.scientific_name, sp.description, sp.habitat, sp.diet, sp.conservation, sp.fun_fact
  FROM public.species_profiles sp
  WHERE sp.normalized_name = public.normalize_animal_label(p_name)
     OR (
       p_scientific IS NOT NULL
       AND public.normalize_animal_label(p_scientific) <> ''
       AND sp.normalized_scientific = public.normalize_animal_label(p_scientific)
     )
  ORDER BY (sp.normalized_name = public.normalize_animal_label(p_name)) DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.species_profile_for(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.species_profile_for(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.species_profile_for(text, text) TO service_role;