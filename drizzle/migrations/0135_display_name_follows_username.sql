CREATE OR REPLACE FUNCTION public.sync_display_name_from_username()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.username IS NOT NULL AND btrim(NEW.username) <> '' THEN
    NEW.display_name := ltrim(btrim(NEW.username), '@');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_display_name_from_username ON public.profiles;
CREATE TRIGGER trg_sync_display_name_from_username
BEFORE INSERT OR UPDATE OF username, display_name ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_display_name_from_username();

UPDATE public.profiles SET display_name = ltrim(btrim(username), '@')
WHERE username IS NOT NULL AND btrim(username) <> '' AND display_name IS DISTINCT FROM ltrim(btrim(username), '@');

COMMENT ON COLUMN public.profiles.display_name IS 'Mirrors username (without @) via trigger; users edit only the username.';