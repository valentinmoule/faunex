CREATE TABLE IF NOT EXISTS public.species_finder_cache (animal_key text PRIMARY KEY, finders bigint NOT NULL);
GRANT ALL ON public.species_finder_cache TO service_role;
ALTER TABLE public.species_finder_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS captures_approved_lower_name_idx ON public.captures (lower(animal_name), user_id) WHERE status = 'approved';

CREATE OR REPLACE FUNCTION public.refresh_species_finder_key(_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n bigint;
BEGIN
  IF _key IS NULL THEN RETURN; END IF;
  SELECT count(distinct user_id) INTO n FROM public.captures WHERE status='approved' AND lower(animal_name)=_key;
  IF n = 0 THEN
    DELETE FROM public.species_finder_cache WHERE animal_key=_key;
  ELSE
    INSERT INTO public.species_finder_cache(animal_key, finders) VALUES (_key, n)
    ON CONFLICT (animal_key) DO UPDATE SET finders = EXCLUDED.finders;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.refresh_species_finder_key(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_species_finder_cache()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF TG_OP='DELETE' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.animal_name IS DISTINCT FROM NEW.animal_name OR OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM public.refresh_species_finder_key(lower(OLD.animal_name));
    END IF;
  END IF;
  IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.animal_name IS DISTINCT FROM NEW.animal_name OR OLD.user_id IS DISTINCT FROM NEW.user_id)) THEN
    IF NEW.status='approved' OR TG_OP='UPDATE' THEN
      PERFORM public.refresh_species_finder_key(lower(NEW.animal_name));
    END IF;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS species_finder_cache_sync ON public.captures;
CREATE TRIGGER species_finder_cache_sync AFTER INSERT OR UPDATE OR DELETE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.trg_species_finder_cache();

INSERT INTO public.species_finder_cache(animal_key, finders)
SELECT lower(animal_name), count(distinct user_id) FROM public.captures WHERE status='approved' GROUP BY lower(animal_name)
ON CONFLICT (animal_key) DO UPDATE SET finders = EXCLUDED.finders;

CREATE OR REPLACE FUNCTION public.species_finder_counts()
 RETURNS TABLE(animal_key text, finders bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT animal_key, finders FROM public.species_finder_cache $$;