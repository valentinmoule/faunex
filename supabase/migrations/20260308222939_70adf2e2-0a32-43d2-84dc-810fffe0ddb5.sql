
CREATE OR REPLACE FUNCTION public.sync_animal_on_capture_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when status becomes 'approved'
  IF NEW.status = 'approved' THEN
    INSERT INTO public.animals (name, scientific_name, category, rarity)
    VALUES (
      NEW.animal_name,
      NEW.scientific_name,
      COALESCE(NEW.category, 'Autre'),
      NEW.rarity
    )
    ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_animal_on_capture
  AFTER INSERT OR UPDATE ON public.captures
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_animal_on_capture_approved();
