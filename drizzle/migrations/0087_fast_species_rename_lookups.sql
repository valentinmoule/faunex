CREATE INDEX IF NOT EXISTS animal_merge_map_norm_old_idx ON public.animal_merge_map (public.normalize_animal_label(old_name));
CREATE INDEX IF NOT EXISTS animals_norm_name_idx ON public.animals (btrim(public.normalize_animal_label(name)));
CREATE INDEX IF NOT EXISTS animals_norm_name_plain_idx ON public.animals (public.normalize_animal_label(name));

CREATE OR REPLACE FUNCTION public.sync_animal_on_capture_approved()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved'
     AND NEW.animal_name IS NOT NULL
     AND NEW.animal_name <> ''
     AND LOWER(NEW.animal_name) <> 'inconnu'
     AND COALESCE(NEW.category, '') <> 'N/A'
     -- Existing tiles need no insert attempt; skipping avoids the costly new-species guard on bulk renames.
     AND NOT EXISTS (SELECT 1 FROM public.animals a WHERE lower(a.name) = lower(NEW.animal_name)) THEN
    INSERT INTO public.animals (name, scientific_name, category, rarity, iucn_status)
    VALUES (NEW.animal_name, NEW.scientific_name,
      public.canonical_animal_category(NEW.category, NEW.animal_name, NEW.scientific_name),
      NEW.rarity, NEW.iucn_status)
    ON CONFLICT (LOWER(name)) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;