
-- Backfill: recompute species_count and total_captures from real approved captures
UPDATE public.profiles p
SET
  species_count = COALESCE(sub.sp, 0),
  total_captures = COALESCE(sub.tc, 0),
  updated_at = now()
FROM (
  SELECT
    c.user_id,
    COUNT(DISTINCT lower(trim(c.animal_name))) FILTER (
      WHERE c.animal_name IS NOT NULL AND c.animal_name <> '' AND lower(c.animal_name) <> 'inconnu'
    ) AS sp,
    COUNT(*) AS tc
  FROM public.captures c
  WHERE c.status = 'approved'
  GROUP BY c.user_id
) sub
WHERE p.user_id = sub.user_id;

-- Reset users who have no approved captures anymore
UPDATE public.profiles p
SET species_count = 0, total_captures = 0, updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.captures c WHERE c.user_id = p.user_id AND c.status = 'approved'
) AND (p.species_count <> 0 OR p.total_captures <> 0);

-- Keep counters in sync on future updates/deletes
CREATE OR REPLACE FUNCTION public.recompute_profile_counters(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sp integer;
  v_tc integer;
BEGIN
  SELECT
    COUNT(DISTINCT lower(trim(animal_name))) FILTER (
      WHERE animal_name IS NOT NULL AND animal_name <> '' AND lower(animal_name) <> 'inconnu'
    ),
    COUNT(*)
  INTO v_sp, v_tc
  FROM public.captures
  WHERE user_id = p_user_id AND status = 'approved';

  UPDATE public.profiles
  SET species_count = COALESCE(v_sp, 0),
      total_captures = COALESCE(v_tc, 0),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_counters_on_capture_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_profile_counters(OLD.user_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.animal_name IS DISTINCT FROM NEW.animal_name
       OR OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM public.recompute_profile_counters(NEW.user_id);
      IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        PERFORM public.recompute_profile_counters(OLD.user_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_counters_upd ON public.captures;
CREATE TRIGGER trg_sync_profile_counters_upd
AFTER UPDATE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_counters_on_capture_change();

DROP TRIGGER IF EXISTS trg_sync_profile_counters_del ON public.captures;
CREATE TRIGGER trg_sync_profile_counters_del
AFTER DELETE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_counters_on_capture_change();
