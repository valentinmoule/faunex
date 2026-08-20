-- 1) Punaise arlequin : fiche entièrement réécrite (correcte)
UPDATE public.captures
SET description = 'La punaise arlequin, ou graphosome rayé, est une punaise de la famille des Pentatomidae. Son corps ovale et bombé mesure 8 à 12 mm et arbore des bandes longitudinales noires et rouge orangé très contrastées, un signal d''avertissement pour les prédateurs.',
    habitat = 'Prairies, friches, bords de chemins et jardins ensoleillés d''Europe, souvent posée sur les ombelles des Apiacées.',
    diet = 'Phytophage : elle aspire la sève et les graines en développement des Apiacées (carotte sauvage, fenouil, berce, panais).',
    fun_fact = 'Ses rayures verticales lui ont valu le surnom de « punaise à rayures de pyjama » ; contrairement aux perce-oreilles, elle ne possède pas de pinces mais un rostre piqueur.'
WHERE scientific_name ILIKE 'Graphosoma%'
  AND (description ILIKE '%perce-oreille%' OR description ILIKE '%perce oreille%' OR description ILIKE '%Graphosomidae%');

-- 2) Autres punaises décrites à tort comme des perce-oreilles
UPDATE public.captures
SET description = regexp_replace(
      regexp_replace(description, '^Ce perce[- ]oreille', 'Cette punaise', 'i'),
      'perce[- ]oreille', 'punaise', 'gi'),
    fun_fact = regexp_replace(COALESCE(fun_fact, ''), 'perce[- ]oreille', 'punaise', 'gi'),
    habitat = regexp_replace(COALESCE(habitat, ''), 'perce[- ]oreille', 'punaise', 'gi'),
    diet = regexp_replace(COALESCE(diet, ''), 'perce[- ]oreille', 'punaise', 'gi')
WHERE (description ILIKE '%perce-oreille%' OR description ILIKE '%perce oreille%'
       OR fun_fact ILIKE '%perce%oreille%' OR habitat ILIKE '%perce%oreille%' OR diet ILIKE '%perce%oreille%')
  AND animal_name NOT ILIKE '%perce%oreille%'
  AND COALESCE(scientific_name, '') NOT ILIKE 'forficul%'
  AND COALESCE(scientific_name, '') NOT ILIKE 'labidur%'
  AND COALESCE(scientific_name, '') NOT ILIKE 'dermapter%';

-- 3) Famille inventée « Graphosomidae » → Pentatomidae
UPDATE public.captures
SET description = replace(description, 'Graphosomidae', 'Pentatomidae')
WHERE description ILIKE '%Graphosomidae%';

-- 4) Corrections identiques côté fiches du bestiaire, si présentes
UPDATE public.animals a
SET name = a.name
WHERE false;