
CREATE OR REPLACE FUNCTION public.sync_animal_on_capture_approved()
RETURNS trigger AS $$
BEGIN
  -- Only sync approved captures with a valid animal name
  IF NEW.status = 'approved' 
     AND NEW.animal_name IS NOT NULL 
     AND NEW.animal_name != '' 
     AND LOWER(NEW.animal_name) != 'inconnu' 
     AND COALESCE(NEW.category, '') != 'N/A' THEN
    INSERT INTO public.animals (name, scientific_name, category, rarity)
    VALUES (
      NEW.animal_name,
      NEW.scientific_name,
      COALESCE(NULLIF(NEW.category, ''), 'Autre'),
      NEW.rarity
    )
    ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
