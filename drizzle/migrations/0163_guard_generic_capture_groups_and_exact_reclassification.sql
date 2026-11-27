CREATE OR REPLACE FUNCTION public.is_reclassification_group_label(p_name text, p_scientific text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  WITH s AS (
    SELECT btrim(regexp_replace(translate(lower(coalesce(p_name,'')), 'àâäéèêëîïôöùûüç''’-', 'aaaeeeeiioouuuc   '), '[^a-z]+', ' ', 'g')) AS n,
      regexp_split_to_array(btrim(lower(coalesce(p_scientific,''))), '\s+') AS t
  )
  SELECT n = ANY(ARRAY['fourmi','fourmi ailee','araignee','araignee commune','mouche','mouche commune'])
    OR (t[1] = ANY(ARRAY['formicidae','araneae','brachycera','muscidae'])
      AND (array_length(t,1)=1 OR t[2] ~ '^spp?\.?$')) FROM s
$$;
REVOKE ALL ON FUNCTION public.is_reclassification_group_label(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_reclassification_group_label(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_reclassification_group_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Preserve the existing explicit service-only moderator force-name bridge.
  IF auth.role()='service_role' AND current_setting('faunex.force_identity',true)='on' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='animals' THEN
    IF (TG_OP='INSERT' OR OLD.name IS DISTINCT FROM NEW.name OR OLD.scientific_name IS DISTINCT FROM NEW.scientific_name)
      AND public.is_reclassification_group_label(NEW.name,NEW.scientific_name) THEN
      RAISE EXCEPTION 'SPECIES_REQUIRED: un groupe ne constitue pas une espèce précise.' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.status='approved'
    AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.animal_name IS DISTINCT FROM NEW.animal_name OR OLD.scientific_name IS DISTINCT FROM NEW.scientific_name)
    AND public.is_reclassification_group_label(NEW.animal_name,NEW.scientific_name) THEN
    RAISE EXCEPTION 'SPECIES_REQUIRED: laisse cette photo en modération tant que son espèce ne peut pas être confirmée.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_reclassification_group_identity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zzzz_guard_reclassification_group_identity BEFORE INSERT OR UPDATE ON public.animals
FOR EACH ROW EXECUTE FUNCTION public.guard_reclassification_group_identity();
CREATE TRIGGER zzzz_guard_reclassification_group_identity BEFORE INSERT OR UPDATE ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.guard_reclassification_group_identity();

CREATE OR REPLACE FUNCTION public.reclassify_exact_generic_capture(p_capture_id uuid,p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.captures%ROWTYPE; a public.animals%ROWTYPE; owner_id uuid;
  before_xp integer; before_level integer; after_xp integer; after_level integer;
  before_count bigint; batch text := 'generic-exact-2026-11-27';
BEGIN
  IF NOT coalesce(public.is_staff(auth.uid()),false) THEN RAISE EXCEPTION 'Staff only' USING ERRCODE='42501'; END IF;
  SELECT user_id INTO owner_id FROM public.captures WHERE id=p_capture_id;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Capture not found'; END IF;
  SELECT xp,level INTO before_xp,before_level FROM public.profiles WHERE user_id=owner_id FOR UPDATE;
  SELECT * INTO c FROM public.captures WHERE id=p_capture_id FOR UPDATE;
  SELECT * INTO a FROM public.animals WHERE id=p_target_id FOR SHARE;
  IF a.id IS NULL OR a.scientific_name !~ '^[A-Z][a-z]+ [a-z]+$'
    OR a.scientific_name ~ '\s(spp?|cf|aff)$'
    OR public.is_reclassification_group_label(a.name,a.scientific_name) THEN
    RAISE EXCEPTION 'Target must be an existing precise species' USING ERRCODE='23514';
  END IF;
  IF c.status<>'approved' OR c.xp_awarded IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Only approved, already rewarded historical photos can be reconciled' USING ERRCODE='23514';
  END IF;
  IF lower(btrim(coalesce(c.scientific_name,'')))<>lower(btrim(a.scientific_name))
    OR (SELECT count(*) FROM public.animals WHERE lower(btrim(scientific_name))=lower(btrim(a.scientific_name)))<>1 THEN
    RAISE EXCEPTION 'An exact unique scientific identity is required; never infer from a group' USING ERRCODE='23514';
  END IF;
  IF c.animal_name=a.name THEN RETURN jsonb_build_object('result','already_applied'); END IF;
  IF NOT public.is_reclassification_group_label(c.animal_name,c.scientific_name) THEN
    RAISE EXCEPTION 'Not a first-wave generic capture' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data,created_at)
    VALUES(batch,'captures',c.id::text,to_jsonb(c),now()),
      (batch,'progression',owner_id::text,jsonb_build_object('xp',before_xp,'level',before_level),now()) ON CONFLICT DO NOTHING;
  SELECT count(*) INTO before_count FROM public.captures WHERE user_id=owner_id;
  UPDATE public.captures SET animal_name=a.name, scientific_name=a.scientific_name WHERE id=c.id;
  SELECT xp,level INTO after_xp,after_level FROM public.profiles WHERE user_id=owner_id;
  IF before_xp IS DISTINCT FROM after_xp OR before_level IS DISTINCT FROM after_level
    OR before_count<>(SELECT count(*) FROM public.captures WHERE user_id=owner_id)
    OR NOT EXISTS(SELECT 1 FROM public.captures WHERE id=c.id AND animal_name=a.name AND scientific_name=a.scientific_name
      AND image_url IS NOT DISTINCT FROM c.image_url AND user_id=c.user_id AND status=c.status AND xp_awarded=c.xp_awarded) THEN
    RAISE EXCEPTION 'Reclassification must preserve photos and progression';
  END IF;
  RETURN jsonb_build_object('result','reclassified','name',a.name,'scientific_name',a.scientific_name);
END $$;
REVOKE ALL ON FUNCTION public.reclassify_exact_generic_capture(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reclassify_exact_generic_capture(uuid,uuid) TO authenticated,service_role;
COMMENT ON FUNCTION public.reclassify_exact_generic_capture(uuid,uuid) IS 'Staff-only snapshot-backed reconciliation of one approved historical photo to its unique existing exact binomial. No guessed species, new reward or photo deletion.';