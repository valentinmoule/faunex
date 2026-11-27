-- Data-only, identity-preserving cleanup approved by Valentin on 2026-11-27.
-- No merge: generic larvae/juveniles cannot establish an adult species identity.
-- Scientific names are retained when no verified French adult name was found.
BEGIN;
INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data)
SELECT 'development-stages-2026-11-27','approved_mapping',old_name,
       jsonb_build_object('new',new_name,'sci',scientific_name,'order',position)
FROM (VALUES
 (1,'Noctuelle de la patience','Mi','Euclidia mi'),
 (2,'Nymphe de Punaise verte du Sud','Punaise verte du Sud','Nezara viridula'),
 (3,'Nymphe de Blatte du Turkestan','Blatte du Turkestan','Blatta lateralis'),
 (4,'Chenille du Sycomore','Noctuelle de l''érable','Acronicta aceris'),
 (5,'Chenille de la Rouille','Noctuelle de la patience','Acronicta rumicis'),
 (6,'Chenille à tente estivale','Écaille fileuse','Hyphantria cunea'),
 (7,'Chenille de sphinx de la tomate','Sphinx de la tomate','Manduca quinquemaculatus'),
 (8,'Chenille à houppes','Olene mendosa','Olene mendosa'),
 (9,'Chenille velue de l''aubergine','Selepa docilis','Selepa docilis')
) AS mapping(position,old_name,new_name,scientific_name)
ON CONFLICT DO NOTHING;

-- Preserve an auditable before-image of each affected explorer's progression.
INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data)
SELECT DISTINCT 'development-stages-2026-11-27','progression',p.user_id::text,
       jsonb_build_object('level',p.level,'xp',p.xp)
FROM public.profiles p JOIN public.captures c ON c.user_id=p.user_id
JOIN public.catalogue_update_snapshots m ON m.row_key=c.animal_name
WHERE m.batch_key='development-stages-2026-11-27' AND m.relation_name='approved_mapping'
ON CONFLICT DO NOTHING;

-- One historical Acronicta photo uses the label occupied by Euclidia.
-- Move only that exact binomial to its existing tile before freeing the label.
INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data)
SELECT 'development-stages-2026-11-27','captures',c.id::text,to_jsonb(c)
FROM public.captures c
WHERE c.animal_name='Noctuelle de la patience' AND c.scientific_name='Acronicta rumicis'
ON CONFLICT DO NOTHING;
UPDATE public.captures SET animal_name='Chenille de la Rouille'
WHERE animal_name='Noctuelle de la patience' AND scientific_name='Acronicta rumicis'
  AND EXISTS(SELECT 1 FROM public.animals WHERE name='Chenille de la Rouille' AND scientific_name='Acronicta rumicis');

-- The order frees the erroneous Euclidia mi label before naming Acronicta rumicis.
INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data)
SELECT 'development-stages-2026-11-27','execution',row_key,
       jsonb_build_object('result',public.apply_approved_catalogue_rename(batch_key,row_key))
FROM (
 SELECT * FROM public.catalogue_update_snapshots
 WHERE batch_key='development-stages-2026-11-27' AND relation_name='approved_mapping'
 ORDER BY (row_data->>'order')::integer
) AS approved
ON CONFLICT DO NOTHING;
UPDATE public.animals SET name_en='Turkestan cockroach'
WHERE name='Blatte du Turkestan' AND scientific_name='Blatta lateralis'
  AND name_en='Turkestan cockroach nymph';
COMMIT;
