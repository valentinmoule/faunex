-- Read-only regressions: a taxonomic mismatch raises division by zero.
SELECT 1 / CASE WHEN EXISTS (
  SELECT 1 FROM public.animals
  WHERE name = 'Demoiselle bleue et jaune' AND scientific_name = 'Chrysiptera hemicyanea'
) THEN 1 ELSE 0 END AS azure_damselfish_identity;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1 FROM public.animals
  WHERE name = 'Demoiselle à queue jaune' AND scientific_name = 'Chrysiptera parasema'
) THEN 1 ELSE 0 END AS yellowtail_stays_distinct;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1 FROM public.captures c
  JOIN public.species_profiles p ON p.scientific_name = c.scientific_name
  WHERE c.id = '54a4dc33-6eed-4f01-8c85-6e11607be8a4'
    AND c.scientific_name = 'Chrysiptera hemicyanea'
    AND c.description = p.description
    AND c.image_url LIKE '%/1792830648404.jpg'
) THEN 1 ELSE 0 END AS reported_capture_and_photo_restored;