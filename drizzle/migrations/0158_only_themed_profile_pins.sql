ALTER TABLE public.pinned_profile_collections ADD CONSTRAINT pinned_profile_collections_themed_only CHECK (collection_key LIKE 'theme:%') NOT VALID;
CREATE OR REPLACE FUNCTION public.block_custom_collection_pin() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pinned_at IS NOT NULL AND OLD.pinned_at IS DISTINCT FROM NEW.pinned_at THEN
    RAISE EXCEPTION 'custom collections can no longer be pinned';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS block_custom_collection_pin ON public.custom_collections;
CREATE TRIGGER block_custom_collection_pin BEFORE INSERT OR UPDATE OF pinned_at ON public.custom_collections FOR EACH ROW EXECUTE FUNCTION public.block_custom_collection_pin();