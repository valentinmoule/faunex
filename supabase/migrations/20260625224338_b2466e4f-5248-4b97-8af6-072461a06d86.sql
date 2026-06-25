-- Realign existing captures with the current bestiary rarity using a case-insensitive name match.
UPDATE public.captures AS c
SET rarity = a.rarity
FROM public.animals AS a
WHERE lower(trim(c.animal_name)) = lower(trim(a.name))
  AND c.rarity IS DISTINCT FROM a.rarity;

-- Keep new/edited captures aligned with the bestiary rarity.
CREATE OR REPLACE FUNCTION public.sync_capture_rarity_from_animal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rarity text;
BEGIN
  IF NEW.animal_name IS NULL OR trim(NEW.animal_name) = '' THEN
    RETURN NEW;
  END IF;

  SELECT a.rarity INTO v_rarity
  FROM public.animals a
  WHERE lower(trim(a.name)) = lower(trim(NEW.animal_name))
  LIMIT 1;

  IF v_rarity IS NOT NULL THEN
    NEW.rarity := v_rarity;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_capture_rarity_from_animal() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_capture_rarity_from_animal() FROM anon;
REVOKE ALL ON FUNCTION public.sync_capture_rarity_from_animal() FROM authenticated;

DROP TRIGGER IF EXISTS sync_capture_rarity_from_animal_trigger ON public.captures;
CREATE TRIGGER sync_capture_rarity_from_animal_trigger
BEFORE INSERT OR UPDATE OF animal_name, rarity ON public.captures
FOR EACH ROW
EXECUTE FUNCTION public.sync_capture_rarity_from_animal();

-- If a bestiary rarity is corrected later, update all matching captures automatically.
CREATE OR REPLACE FUNCTION public.sync_captures_on_animal_rarity_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rarity IS DISTINCT FROM OLD.rarity OR lower(trim(NEW.name)) IS DISTINCT FROM lower(trim(OLD.name)) THEN
    UPDATE public.captures
    SET rarity = NEW.rarity
    WHERE lower(trim(animal_name)) = lower(trim(NEW.name))
      AND rarity IS DISTINCT FROM NEW.rarity;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_captures_on_animal_rarity_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_captures_on_animal_rarity_update() FROM anon;
REVOKE ALL ON FUNCTION public.sync_captures_on_animal_rarity_update() FROM authenticated;

DROP TRIGGER IF EXISTS sync_captures_on_animal_rarity_update_trigger ON public.animals;
CREATE TRIGGER sync_captures_on_animal_rarity_update_trigger
AFTER UPDATE OF name, rarity ON public.animals
FOR EACH ROW
EXECUTE FUNCTION public.sync_captures_on_animal_rarity_update();