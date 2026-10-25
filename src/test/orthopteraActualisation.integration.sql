-- Read-only catalogue update regressions: each division fails on a broken rule.
SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM public.animals WHERE name='Courtilière commune' AND scientific_name='Gryllotalpa gryllotalpa') THEN 1 ELSE 0 END AS same_species_rename;
SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM public.animals WHERE name='Grillon tropical' AND scientific_name='Gryllodes sigillatus') AND EXISTS (SELECT 1 FROM public.animals WHERE name='Grillon domestique' AND scientific_name='Acheta domesticus') THEN 1 ELSE 0 END AS reused_name_distinguishes_species;
SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM public.animals WHERE name='Criquet ensanglanté' AND scientific_name='Stethophyma grossum') AND EXISTS (SELECT 1 FROM public.animals WHERE name='Criquet des genévriers' AND scientific_name='Euthystira brachyptera') THEN 1 ELSE 0 END AS ensanglante_distinguishes_species;
SELECT 1 / CASE WHEN NOT EXISTS (
 SELECT 1 FROM public.catalogue_update_snapshots s LEFT JOIN public.captures c ON c.id=s.row_key::uuid
 WHERE s.batch_key='orthoptera-2026-10-25' AND s.relation_name='captures'
 AND (c.id IS NULL OR c.image_url IS DISTINCT FROM s.row_data->>'image_url'
 OR c.created_at IS DISTINCT FROM (s.row_data->>'created_at')::timestamptz
 OR c.scientific_name IS DISTINCT FROM CASE WHEN s.row_data->>'scientific_name'='chortipus apricarius' THEN 'Chorthippus apricarius' ELSE s.row_data->>'scientific_name' END)
) AND EXISTS (SELECT 1 FROM public.catalogue_update_snapshots WHERE batch_key='orthoptera-2026-10-25' AND relation_name='captures') THEN 1 ELSE 0 END AS observations_preserved;
SELECT 1 / CASE WHEN public.reward_species_group('Dectique verrucivore','Decticus verrucivorus','Insectes')='grasshoppers' AND public.reward_species_group('Œdipode germanique','Oedipoda germanica','Insectes')='grasshoppers' THEN 1 ELSE 0 END AS collection_membership;