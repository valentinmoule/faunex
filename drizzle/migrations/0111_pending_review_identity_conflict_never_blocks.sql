CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE res record; mapped text; own_key text; target_key text; typed_sci text;
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
   IF own_key IS NULL OR target_key IS NULL OR own_key=target_key THEN NEW.animal_name:=mapped; END IF;
  END IF;
  IF coalesce(NEW.animal_name,'')<>'' AND lower(NEW.animal_name)<>'inconnu' THEN
   BEGIN
    SELECT * INTO res FROM public.resolve_species_identity(NEW.animal_name,NEW.scientific_name);
    IF res.matched THEN NEW.animal_name:=res.name; NEW.scientific_name:=coalesce(res.scientific_name,NEW.scientific_name); END IF;
   EXCEPTION WHEN raise_exception THEN
    IF public.identity_force_allowed() THEN
     NULL;
    ELSIF NEW.status = 'pending_review' THEN
     -- A request awaiting moderation must never fail because the explorer's
     -- names disagree or are ambiguous: moderators settle it. The typed
     -- scientific name is kept in the description for them, then the common
     -- name alone is resolved (or kept as typed).
     typed_sci := nullif(btrim(NEW.scientific_name),'');
     IF typed_sci IS NOT NULL THEN
      NEW.description := concat_ws(E'\n\n', nullif(btrim(NEW.description),''), 'Nom scientifique proposé : ' || typed_sci);
      NEW.scientific_name := NULL;
     END IF;
     BEGIN
      SELECT * INTO res FROM public.resolve_species_identity(NEW.animal_name, NULL);
      IF res.matched THEN NEW.animal_name:=res.name; NEW.scientific_name:=res.scientific_name; END IF;
     EXCEPTION WHEN raise_exception THEN
      NULL;
     END;
    ELSE
     RAISE;
    END IF;
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