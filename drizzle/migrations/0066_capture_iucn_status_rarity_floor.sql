-- Rareté des nouvelles espèces : le statut UICN est désormais déterminé à
-- l'identification (identify-animal) et porté par la capture jusqu'à la fiche,
-- pour qu'une espèce menacée ne naisse jamais « commune ».
ALTER TABLE public.captures ADD COLUMN IF NOT EXISTS iucn_status text;

ALTER TABLE public.captures DROP CONSTRAINT IF EXISTS captures_iucn_status_check;
ALTER TABLE public.captures ADD CONSTRAINT captures_iucn_status_check
  CHECK (iucn_status IS NULL OR iucn_status IN ('LC','NT','VU','EN','CR','EW','EX','DD','NE'));

-- Le déclencheur d'approbation propage le statut UICN de la capture à la fiche.
CREATE OR REPLACE FUNCTION public.sync_animal_on_capture_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND NEW.animal_name IS NOT NULL
     AND NEW.animal_name <> ''
     AND LOWER(NEW.animal_name) <> 'inconnu'
     AND COALESCE(NEW.category, '') <> 'N/A' THEN
    INSERT INTO public.animals (name, scientific_name, category, rarity, iucn_status)
    VALUES (
      NEW.animal_name,
      NEW.scientific_name,
      public.canonical_animal_category(NEW.category, NEW.animal_name, NEW.scientific_name),
      NEW.rarity,
      NEW.iucn_status
    )
    ON CONFLICT (LOWER(name)) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_animal_on_capture_approved() FROM PUBLIC, anon, authenticated;