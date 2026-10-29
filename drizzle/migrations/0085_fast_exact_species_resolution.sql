CREATE OR REPLACE FUNCTION public.resolve_species_identity(p_name text,p_scientific text)
RETURNS TABLE(name text,scientific_name text,matched boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE best record; other record; exact_animal record; nn text:=nullif(btrim(public.normalize_animal_label(public.strip_label_parenthetical(p_name))),''); ns text:=nullif(btrim(public.normalize_animal_label(p_scientific)),'');
BEGIN
 -- Indexed exact-name lookups must not scan/edit-distance the entire catalogue
 -- for every capture changed by an administrator's rename.
 SELECT a.name,a.scientific_name INTO exact_animal FROM public.animals a
 WHERE lower(a.name)=lower(btrim(public.strip_label_parenthetical(p_name))) LIMIT 1;
 IF exact_animal.name IS NULL AND nn IS NOT NULL THEN
  SELECT a.name,a.scientific_name INTO exact_animal FROM public.animals a
  WHERE btrim(public.normalize_animal_label(a.name))=nn LIMIT 1;
 END IF;
 IF exact_animal.name IS NOT NULL THEN
  IF ns IS NOT NULL AND nullif(btrim(public.normalize_animal_label(exact_animal.scientific_name)),'') IS NOT NULL AND btrim(public.normalize_animal_label(exact_animal.scientific_name))<>ns THEN
   RAISE EXCEPTION 'SPECIES_IDENTITY_CONFLICT: common and scientific names disagree';
  END IF;
  RETURN QUERY SELECT exact_animal.name,exact_animal.scientific_name,true;
  RETURN;
 END IF;
 SELECT c.* INTO best FROM public.catalogue_species_candidates(p_name,p_scientific) c ORDER BY c.priority,c.distance,c.name LIMIT 1;
 IF best.name IS NULL THEN RETURN QUERY SELECT btrim(public.strip_label_parenthetical(p_name)),nullif(btrim(p_scientific),''),false; RETURN; END IF;
 SELECT c.* INTO other FROM public.catalogue_species_candidates(p_name,p_scientific) c WHERE c.name<>best.name ORDER BY c.priority,c.distance,c.name LIMIT 1;
 IF other.name IS NOT NULL AND other.priority=best.priority AND (best.priority<3 OR other.distance<=best.distance) THEN
   RAISE EXCEPTION 'AMBIGUOUS_SPECIES: verify the exact species name';
 END IF;
 RETURN QUERY SELECT best.name,best.scientific_name,true;
END $$;