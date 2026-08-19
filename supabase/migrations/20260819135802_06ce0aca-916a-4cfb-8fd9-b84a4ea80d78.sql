-- Une seule identification confirmée par capture dans le dataset
CREATE UNIQUE INDEX IF NOT EXISTS uq_ml_dataset_events_confirmed
  ON public.ml_dataset_events (capture_id)
  WHERE is_ground_truth = true AND capture_id IS NOT NULL;

-- Rattachement automatique au catalogue d'espèces existant
CREATE OR REPLACE FUNCTION public.ml_dataset_link_animal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.animal_id IS NULL THEN
    SELECT m.id INTO NEW.animal_id
    FROM public.match_animal(
      COALESCE(NEW.label_name, NEW.predicted_name),
      COALESCE(NEW.label_scientific_name, NEW.predicted_scientific_name)
    ) m;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ml_dataset_link_animal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ml_dataset_link_animal ON public.ml_dataset_events;
CREATE TRIGGER trg_ml_dataset_link_animal
BEFORE INSERT ON public.ml_dataset_events
FOR EACH ROW EXECUTE FUNCTION public.ml_dataset_link_animal();

-- Toute capture qui passe en "approved" alimente le dataset consolidé
CREATE OR REPLACE FUNCTION public.ml_dataset_capture_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND NEW.image_url IS NOT NULL
     AND COALESCE(NEW.animal_name, '') <> ''
     AND lower(NEW.animal_name) <> 'inconnu' THEN
    INSERT INTO public.ml_dataset_events (
      capture_id, user_id, event_type, source, image_url,
      label_name, label_scientific_name, label_category, label_rarity,
      subject_bbox, user_description, location, latitude, longitude,
      is_ground_truth
    ) VALUES (
      NEW.id, NEW.user_id, 'moderation_approved', 'capture-trigger', NEW.image_url,
      NEW.animal_name, NEW.scientific_name, NEW.category, NEW.rarity,
      NEW.subject_bbox, NEW.description, NEW.location, NEW.latitude, NEW.longitude,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ml_dataset_capture_confirmed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ml_dataset_capture_confirmed_ins ON public.captures;
CREATE TRIGGER trg_ml_dataset_capture_confirmed_ins
AFTER INSERT ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.ml_dataset_capture_confirmed();

DROP TRIGGER IF EXISTS trg_ml_dataset_capture_confirmed_upd ON public.captures;
CREATE TRIGGER trg_ml_dataset_capture_confirmed_upd
AFTER UPDATE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.ml_dataset_capture_confirmed();