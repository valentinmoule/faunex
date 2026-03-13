
-- Function to update regions_explored count based on distinct locations
CREATE OR REPLACE FUNCTION public.update_regions_on_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(DISTINCT location) INTO v_count
  FROM public.captures
  WHERE user_id = NEW.user_id
    AND location IS NOT NULL
    AND location != '';

  UPDATE public.profiles
  SET regions_explored = v_count, updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Trigger on capture insert
CREATE TRIGGER trg_update_regions_on_capture
AFTER INSERT ON public.captures
FOR EACH ROW
EXECUTE FUNCTION public.update_regions_on_capture();
