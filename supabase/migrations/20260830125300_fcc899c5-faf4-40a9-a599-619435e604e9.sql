-- Fusion du doublon orthographique « Aigle bott » → « Aigle botté »
UPDATE public.animal_departments d
SET animal_name = 'Aigle botté'
WHERE d.animal_name = 'Aigle bott'
  AND NOT EXISTS (
    SELECT 1 FROM public.animal_departments x
    WHERE x.animal_name = 'Aigle botté' AND x.department_code = d.department_code
  );

DELETE FROM public.animal_departments WHERE animal_name = 'Aigle bott';

UPDATE public.captures SET animal_name = 'Aigle botté' WHERE animal_name = 'Aigle bott';

INSERT INTO public.animal_merge_map (old_name, new_name, mode)
VALUES ('Aigle bott', 'Aigle botté', 'typo')
ON CONFLICT DO NOTHING;

DELETE FROM public.animals WHERE name = 'Aigle bott';