-- Fusionne les fausses races bovines inventées vers "Vache Limousine"
-- 1) supprime les captures qui créeraient un doublon pour un même utilisateur
DELETE FROM public.captures c
WHERE c.animal_name IN ('Limonaine','Limonera')
  AND EXISTS (
    SELECT 1 FROM public.captures c2
    WHERE c2.user_id = c.user_id
      AND c2.animal_name = 'Vache Limousine'
      AND c2.id <> c.id
  );

-- 2) renomme les captures restantes
UPDATE public.captures
SET animal_name = 'Vache Limousine',
    scientific_name = 'Bos taurus',
    category = 'Mammifères',
    rarity = 'common'
WHERE animal_name IN ('Limonaine','Limonera');

-- 3) nettoie le bestiaire
DELETE FROM public.animals WHERE name IN ('Limonaine','Limonera');

-- 4) recalcule les compteurs des utilisateurs concernés
SELECT public.recompute_profile_counters(p.user_id) FROM public.profiles p
WHERE p.user_id IN ('f130e8c9-c8c3-4c4f-8e38-62ba1c943ae3','c5813646-cb98-4da0-8646-a117a4310fa7');