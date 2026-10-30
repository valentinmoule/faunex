CREATE OR REPLACE FUNCTION public.ml_dataset_link_animal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  -- Dataset linking is best-effort: an ambiguous or conflicting identity must never block approvals.
  IF NEW.animal_id IS NULL THEN
    BEGIN
      SELECT m.id INTO NEW.animal_id
      FROM public.match_animal(COALESCE(NEW.label_name, NEW.predicted_name), COALESCE(NEW.label_scientific_name, NEW.predicted_scientific_name)) m;
    EXCEPTION WHEN raise_exception THEN NEW.animal_id := NULL;
    END;
  END IF;
  IF NEW.taxon_id IS NULL THEN
    IF NEW.animal_id IS NOT NULL THEN
      SELECT a.taxon_id INTO NEW.taxon_id FROM public.animals a WHERE a.id = NEW.animal_id;
    END IF;
    IF NEW.taxon_id IS NULL THEN
      BEGIN
        SELECT m.id INTO NEW.taxon_id
        FROM public.match_taxon(COALESCE(NEW.label_name, NEW.predicted_name), COALESCE(NEW.label_scientific_name, NEW.predicted_scientific_name)) m;
      EXCEPTION WHEN raise_exception THEN NEW.taxon_id := NULL;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;