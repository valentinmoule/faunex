-- Fix wrong vernacular/scientific pairings for storks
UPDATE public.taxa
SET vernacular_name = 'Tantale ibis', updated_at = now()
WHERE id = 'ff02ae0d-5cac-4d17-bdcf-e0f30b05298a';

UPDATE public.taxa
SET vernacular_name = 'Cigogne maguari', scientific_name = 'Ciconia maguari', updated_at = now()
WHERE id = '74e197c7-70e1-44d4-9c05-99c0d7403e1d';

UPDATE public.animals
SET name = 'Tantale ibis'
WHERE id = 'c9137624-49be-4ac7-8d09-d3992ab6b3bf';

UPDATE public.animals
SET name = 'Cigogne maguari', scientific_name = 'Ciconia maguari'
WHERE id = 'cae58be5-2009-4ca2-a141-ee0c91ec92dd';

UPDATE public.captures
SET animal_name = 'Tantale ibis'
WHERE scientific_name = 'Mycteria ibis';

UPDATE public.captures
SET animal_name = 'Cigogne maguari', scientific_name = 'Ciconia maguari'
WHERE scientific_name = 'Euxenura maguari';

-- Proper taxon for the real Jabiru d'Afrique so it can never collide again
INSERT INTO public.taxa (parent_id, rank, main_category, vernacular_name, scientific_name, scientific_rank, scope, rarity, collectible, status)
SELECT NULL, 'species', 'Oiseaux', 'Jabiru d''Afrique', 'Ephippiorhynchus senegalensis', 'species', 'monde', 'rare', true, 'validated'
WHERE NOT EXISTS (
  SELECT 1 FROM public.taxa WHERE scientific_name = 'Ephippiorhynchus senegalensis'
);

INSERT INTO public.taxon_synonyms (taxon_id, label, normalized_label, kind, lang)
SELECT t.id, s.label, public.normalize_animal_label(s.label), 'vernacular', 'fr'
FROM public.taxa t
JOIN (VALUES
  ('Mycteria ibis', 'Ibis-tantale'),
  ('Mycteria ibis', 'Tantale africain'),
  ('Ephippiorhynchus senegalensis', 'Jabiru du Sénégal')
) AS s(sci, label) ON t.scientific_name = s.sci
WHERE NOT EXISTS (
  SELECT 1 FROM public.taxon_synonyms x
  WHERE x.taxon_id = t.id AND x.normalized_label = public.normalize_animal_label(s.label)
);