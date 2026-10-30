CREATE OR REPLACE FUNCTION public.identity_force_allowed() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(current_setting('faunex.force_identity', true),'')='on'
      OR (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')))
$$;
REVOKE ALL ON FUNCTION public.identity_force_allowed() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE res record;
BEGIN
 IF TG_TABLE_NAME='captures' THEN
  NEW.animal_name:=public.canonical_animal_name(NEW.animal_name);
  IF coalesce(NEW.animal_name,'')<>'' AND lower(NEW.animal_name)<>'inconnu' THEN
   BEGIN
    SELECT * INTO res FROM public.resolve_species_identity(NEW.animal_name,NEW.scientific_name);
    IF res.matched THEN NEW.animal_name:=res.name; NEW.scientific_name:=coalesce(res.scientific_name,NEW.scientific_name); END IF;
   EXCEPTION WHEN raise_exception THEN
    -- A moderator's forced identity is kept verbatim.
    IF NOT public.identity_force_allowed() THEN RAISE; END IF;
   END;
  END IF;
 ELSE NEW.name:=public.canonical_animal_name(NEW.name);
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_new_catalogue_species() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE res record;
BEGIN
 PERFORM pg_advisory_xact_lock(72590131);
 BEGIN
  SELECT * INTO res FROM public.resolve_species_identity(NEW.name,NEW.scientific_name);
 EXCEPTION WHEN raise_exception THEN
  IF public.identity_force_allowed() THEN
   IF EXISTS(SELECT 1 FROM public.animals a WHERE lower(a.name)=lower(NEW.name)) THEN RETURN NULL; END IF;
   RETURN NEW;
  END IF;
  RAISE;
 END;
 IF res.matched THEN
  IF EXISTS(SELECT 1 FROM public.animals a WHERE public.normalize_animal_label(a.name)=public.normalize_animal_label(res.name)) THEN RETURN NULL; END IF;
  NEW.name:=res.name; NEW.scientific_name:=coalesce(res.scientific_name,NEW.scientific_name);
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.moderation_force_apply_capture(p_capture_id uuid, p_payload jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM set_config('faunex.force_identity','on',true);
 UPDATE public.captures SET
  animal_name = coalesce(p_payload->>'animal_name', animal_name),
  scientific_name = CASE WHEN p_payload ? 'scientific_name' THEN p_payload->>'scientific_name' ELSE scientific_name END,
  category = CASE WHEN p_payload ? 'category' THEN p_payload->>'category' ELSE category END,
  description = CASE WHEN p_payload ? 'description' THEN p_payload->>'description' ELSE description END,
  habitat = CASE WHEN p_payload ? 'habitat' THEN p_payload->>'habitat' ELSE habitat END,
  diet = CASE WHEN p_payload ? 'diet' THEN p_payload->>'diet' ELSE diet END,
  conservation = CASE WHEN p_payload ? 'conservation' THEN p_payload->>'conservation' ELSE conservation END,
  fun_fact = CASE WHEN p_payload ? 'fun_fact' THEN p_payload->>'fun_fact' ELSE fun_fact END,
  rarity = CASE WHEN p_payload ? 'rarity' THEN p_payload->>'rarity' ELSE rarity END
 WHERE id = p_capture_id;
 PERFORM set_config('faunex.force_identity','',true);
END $$;
REVOKE ALL ON FUNCTION public.moderation_force_apply_capture(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderation_force_apply_capture(uuid, jsonb) TO service_role;