CREATE OR REPLACE FUNCTION public.recompute_profile_counters(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(*)
  INTO v_total
  FROM public.captures
  WHERE user_id = p_user_id
    AND status = 'approved';

  UPDATE public.profiles
  SET species_count = COALESCE(v_total, 0),
      total_captures = COALESCE(v_total, 0),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_counters_on_capture_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_profile_counters(OLD.user_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM public.recompute_profile_counters(NEW.user_id);
      IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        PERFORM public.recompute_profile_counters(OLD.user_id);
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_profile_counters(NEW.user_id);
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_profile_counters_ins ON public.captures;
CREATE TRIGGER trg_sync_profile_counters_ins
AFTER INSERT ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_counters_on_capture_change();

DROP TRIGGER IF EXISTS trg_sync_profile_counters_upd ON public.captures;
CREATE TRIGGER trg_sync_profile_counters_upd
AFTER UPDATE OF status, user_id ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_counters_on_capture_change();

DROP TRIGGER IF EXISTS trg_sync_profile_counters_del ON public.captures;
CREATE TRIGGER trg_sync_profile_counters_del
AFTER DELETE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_counters_on_capture_change();

CREATE OR REPLACE FUNCTION public.xp_on_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_xp integer;
  v_capture_count integer;
  v_bonus integer := 0;
BEGIN
  CASE NEW.rarity
    WHEN 'common' THEN v_xp := 60;
    WHEN 'rare' THEN v_xp := 150;
    WHEN 'epic' THEN v_xp := 300;
    WHEN 'mythic' THEN v_xp := 600;
    ELSE v_xp := 60;
  END CASE;

  SELECT COUNT(*) INTO v_capture_count
  FROM public.captures
  WHERE user_id = NEW.user_id AND status = 'approved';

  IF v_capture_count > 0 AND v_capture_count % 5 = 0 THEN
    v_bonus := 100;
  END IF;

  UPDATE public.profiles
  SET total_captures = v_capture_count,
      species_count = v_capture_count,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  PERFORM public.grant_xp(NEW.user_id, v_xp + v_bonus);
  RETURN NEW;
END;
$function$;