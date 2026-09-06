-- Les fiches déjà rédigées existent souvent dans les captures approuvées mais pas
-- dans species_profiles : on les récupère au lieu de les faire regénérer par l'IA.
INSERT INTO public.species_profiles
  (normalized_name, animal_name, scientific_name, normalized_scientific,
   description, habitat, diet, conservation, fun_fact, source)
SELECT c.nk, c.animal_name, c.scientific_name,
       NULLIF(public.normalize_animal_label(COALESCE(c.scientific_name, '')), ''),
       c.description, c.habitat, c.diet, c.conservation, c.fun_fact, 'capture_backfill'
FROM (
  SELECT DISTINCT ON (public.normalize_animal_label(animal_name))
    public.normalize_animal_label(animal_name) AS nk,
    animal_name, scientific_name, description, habitat, diet, conservation, fun_fact
  FROM public.captures
  WHERE status = 'approved'
    AND description IS NOT NULL AND length(description) > 40
  ORDER BY public.normalize_animal_label(animal_name), created_at DESC
) c
WHERE NOT EXISTS (
  SELECT 1 FROM public.species_profiles sp WHERE sp.normalized_name = c.nk
)
ON CONFLICT DO NOTHING;