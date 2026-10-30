CREATE OR REPLACE FUNCTION public.guard_domestic_chicken_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- Admins and moderators may force any identity, including a generic chicken tile.
  IF auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME='animals' THEN
    IF public.is_generic_domestic_chicken(NEW.name) THEN
      RAISE EXCEPTION 'DOMESTIC_BREED_REQUIRED: une race de poule identifiable est requise.' USING ERRCODE='23514';
    END IF;
  ELSE
    IF NEW.status='approved' AND public.is_generic_domestic_chicken(NEW.animal_name) AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.animal_name IS DISTINCT FROM NEW.animal_name OR OLD.scientific_name IS DISTINCT FROM NEW.scientific_name) THEN
      RAISE EXCEPTION 'DOMESTIC_BREED_REQUIRED: préciser la race ou conserver la capture en modération.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;