-- Merge duplicate arachnid entries into canonical cards (delete conflicts first)
INSERT INTO public.animal_merge_map (old_name, new_name, mode) VALUES
  ('Pholque phalangide', 'Pholque phalangiste', 'merge'),
  ('Pholcidé', 'Pholcidae', 'merge'),
  ('Faucheur des murailles', 'Faucheux', 'merge')
ON CONFLICT DO NOTHING;

-- 1) Drop old-name captures when the user already owns the canonical species
DELETE FROM public.captures c
USING public.captures keep
WHERE keep.user_id = c.user_id
  AND (
    (lower(btrim(c.animal_name)) = 'pholque phalangide' AND lower(btrim(keep.animal_name)) = 'pholque phalangiste')
    OR (lower(btrim(c.animal_name)) = 'pholcidé' AND lower(btrim(keep.animal_name)) = 'pholcidae')
    OR (lower(btrim(c.animal_name)) = 'faucheur des murailles' AND lower(btrim(keep.animal_name)) = 'faucheux')
  );

-- 2) Rename remaining old-name captures to the canonical species
UPDATE public.captures SET animal_name = 'Pholque phalangiste', scientific_name = 'Pholcus phalangioides'
WHERE lower(btrim(animal_name)) = 'pholque phalangide';

UPDATE public.captures SET animal_name = 'Pholcidae', scientific_name = 'Pholcidae'
WHERE lower(btrim(animal_name)) = 'pholcidé';

UPDATE public.captures SET animal_name = 'Faucheux', scientific_name = 'Phalangium opilio'
WHERE lower(btrim(animal_name)) = 'faucheur des murailles';

-- 3) Remove the duplicate catalogue entries and description sheets
DELETE FROM public.species_profiles WHERE animal_name IN ('Pholque phalangide', 'Pholcidé', 'Faucheur des murailles');
DELETE FROM public.animals WHERE name IN ('Pholque phalangide', 'Pholcidé', 'Faucheur des murailles');

-- 4) Keep the old names as synonyms for AI identification
INSERT INTO public.taxon_synonyms (taxon_id, label, normalized_label, kind, lang)
SELECT t.id, v.label, lower(v.label), 'vernacular', 'fr'
FROM (VALUES
  ('Pholcus phalangioides', 'Pholque phalangide'),
  ('Pholcidae', 'Pholcidé'),
  ('Phalangium opilio', 'Faucheur des murailles')
) AS v(sci, label)
JOIN public.taxa t ON t.scientific_name = v.sci
ON CONFLICT DO NOTHING;
