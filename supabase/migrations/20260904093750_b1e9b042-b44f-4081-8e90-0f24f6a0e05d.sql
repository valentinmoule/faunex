-- Merge remaining Pholcidae family duplicates into the canonical card « Pholque »
INSERT INTO public.animal_merge_map (old_name, new_name, mode) VALUES
  ('Pholcidae', 'Pholque', 'merge'),
  ('Araignée cave', 'Pholque', 'merge'),
  ('Daddy Longlegs Spider', 'Pholque', 'merge')
ON CONFLICT DO NOTHING;

DELETE FROM public.captures c
USING public.captures keep
WHERE keep.user_id = c.user_id
  AND lower(btrim(c.animal_name)) IN ('pholcidae', 'araignée cave', 'daddy longlegs spider')
  AND lower(btrim(keep.animal_name)) = 'pholque';

UPDATE public.captures SET animal_name = 'Pholque', scientific_name = 'Pholcidae'
WHERE lower(btrim(animal_name)) IN ('pholcidae', 'araignée cave', 'daddy longlegs spider');

DELETE FROM public.species_profiles WHERE animal_name IN ('Pholcidae', 'Araignée cave', 'Daddy Longlegs Spider');
DELETE FROM public.animals WHERE name IN ('Pholcidae', 'Araignée cave', 'Daddy Longlegs Spider');

INSERT INTO public.taxon_synonyms (taxon_id, label, normalized_label, kind, lang)
SELECT t.id, v.label, lower(v.label), 'vernacular', v.lang
FROM (VALUES
  ('Pholcidae', 'Pholcidae', 'fr'),
  ('Pholcidae', 'Araignée cave', 'fr'),
  ('Pholcidae', 'Daddy Longlegs Spider', 'en')
) AS v(sci, label, lang)
JOIN public.taxa t ON t.scientific_name = v.sci
ON CONFLICT DO NOTHING;

UPDATE public.taxa SET vernacular_name = 'Pholque', vernacular_name_en = 'Cellar spiders'
WHERE scientific_name = 'Pholcidae';

UPDATE public.animals SET name_en = 'Cellar spiders' WHERE name = 'Pholque';
