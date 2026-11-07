-- Old merge-map aliases must never rewrite a name onto a fiche with a different binomial.
CREATE OR REPLACE FUNCTION public.binomial_key(p_scientific text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_scientific IS NULL OR btrim(p_scientific) !~ '^[A-Za-z]+ [a-z-]+' THEN NULL
    WHEN public.is_shared_domestic_binomial(p_scientific) THEN NULL
    ELSE lower(split_part(btrim(p_scientific),' ',1) || ' ' || split_part(btrim(p_scientific),' ',2))
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE res record; mapped text; own_key text; target_key text;
BEGIN
 IF TG_TABLE_NAME='captures' THEN
  IF TG_OP='UPDATE' AND NEW.animal_name IS NOT DISTINCT FROM OLD.animal_name AND NEW.scientific_name IS NOT DISTINCT FROM OLD.scientific_name THEN
   RETURN NEW;
  END IF;
  mapped:=public.canonical_animal_name(NEW.animal_name);
  IF mapped IS DISTINCT FROM NEW.animal_name THEN
   own_key:=public.binomial_key(NEW.scientific_name);
   IF own_key IS NOT NULL THEN
    SELECT public.binomial_key(a.scientific_name) INTO target_key FROM public.animals a WHERE lower(a.name)=lower(mapped) LIMIT 1;
   END IF;
   -- Two distinct binomials are two species: ignore the alias.
   IF own_key IS NULL OR target_key IS NULL OR own_key=target_key THEN NEW.animal_name:=mapped; END IF;
  END IF;
  IF coalesce(NEW.animal_name,'')<>'' AND lower(NEW.animal_name)<>'inconnu' THEN
   BEGIN
    SELECT * INTO res FROM public.resolve_species_identity(NEW.animal_name,NEW.scientific_name);
    IF res.matched THEN NEW.animal_name:=res.name; NEW.scientific_name:=coalesce(res.scientific_name,NEW.scientific_name); END IF;
   EXCEPTION WHEN raise_exception THEN
    IF NOT public.identity_force_allowed() THEN RAISE; END IF;
   END;
  END IF;
 ELSE
  mapped:=public.canonical_animal_name(NEW.name);
  IF mapped IS DISTINCT FROM NEW.name THEN
   own_key:=public.binomial_key(NEW.scientific_name);
   IF own_key IS NOT NULL THEN
    SELECT public.binomial_key(a.scientific_name) INTO target_key FROM public.animals a WHERE lower(a.name)=lower(mapped) AND a.id IS DISTINCT FROM NEW.id LIMIT 1;
   END IF;
   IF own_key IS NULL OR target_key IS NULL OR own_key=target_key THEN NEW.name:=mapped; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $function$;

-- Grue royale (Balearica regulorum) and Grue couronnée noire (Balearica pavonina) are distinct species.
DELETE FROM public.animal_merge_map
WHERE new_name='Grue couronnée noire'
  AND old_name IN ('Grue royale','Grue couronnée grise','Grue couronnée');

DELETE FROM public.taxon_synonyms
WHERE taxon_id='61686044-a386-4352-93f9-a31a34b1765b' AND normalized_label='grue royale';

UPDATE public.taxa
SET vernacular_name='Grue royale', vernacular_name_en='Grey crowned crane'
WHERE id='61686044-a386-4352-93f9-a31a34b1765b';

INSERT INTO public.animals (name, scientific_name, category, name_en, iucn_status, rarity, taxon_id)
SELECT 'Grue royale','Balearica regulorum','Oiseaux','Grey crowned crane','EN','ultra_rare','61686044-a386-4352-93f9-a31a34b1765b'
WHERE NOT EXISTS (SELECT 1 FROM public.animals WHERE lower(name)='grue royale');