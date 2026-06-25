
-- Deduplicate animals table by case-insensitive name, keeping the row with the most data / earliest
WITH ranked AS (
  SELECT id, name, LOWER(name) AS lname,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(name)
      ORDER BY (CASE WHEN scientific_name IS NOT NULL AND scientific_name <> '' THEN 0 ELSE 1 END),
               created_at ASC
    ) AS rn
  FROM public.animals
)
DELETE FROM public.animals a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

-- Drop the case-sensitive unique and add case-insensitive unique on lower(name)
ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS animals_name_lower_key ON public.animals (LOWER(name));

-- Update the sync trigger to use the case-insensitive conflict target
CREATE OR REPLACE FUNCTION public.sync_animal_on_capture_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved'
     AND NEW.animal_name IS NOT NULL
     AND NEW.animal_name <> ''
     AND LOWER(NEW.animal_name) <> 'inconnu'
     AND COALESCE(NEW.category, '') <> 'N/A' THEN
    INSERT INTO public.animals (name, scientific_name, category, rarity)
    VALUES (
      NEW.animal_name,
      NEW.scientific_name,
      COALESCE(NULLIF(NEW.category, ''), 'Autre'),
      NEW.rarity
    )
    ON CONFLICT (LOWER(name)) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
