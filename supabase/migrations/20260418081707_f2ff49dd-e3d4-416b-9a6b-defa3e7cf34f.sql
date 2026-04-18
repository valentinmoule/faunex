-- Fusion des catégories marines dans des catégories existantes
UPDATE public.animals SET category = 'Poissons' WHERE category = 'Vie marine (monde)';
UPDATE public.animals SET category = 'Mammifères' WHERE category = 'Mammifères marins';

UPDATE public.captures SET category = 'Poissons' WHERE category = 'Vie marine (monde)' OR category = 'Vie marine';
UPDATE public.captures SET category = 'Mammifères' WHERE category = 'Mammifères marins';