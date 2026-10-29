CREATE OR REPLACE FUNCTION public.admin_reported_species_action(p_report_ids uuid[], p_animal_id uuid, p_expected_name text, p_expected_scientific text, p_action text, p_value text DEFAULT NULL, p_target_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE a public.animals%ROWTYPE; b public.animals%ROWTYPE; n text; s text; batch text; affected integer; target_taxon uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
 IF p_action NOT IN ('vernacular','scientific','merge') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
 -- Serialize catalogue changes and prevent new captures racing the collision check.
 LOCK TABLE public.animals, public.captures IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO a FROM public.animals WHERE id=p_animal_id FOR UPDATE;
 IF a.id IS NULL OR a.name IS DISTINCT FROM p_expected_name OR coalesce(a.scientific_name,'')<>coalesce(p_expected_scientific,'') THEN RAISE EXCEPTION 'STALE_SPECIES'; END IF;
 PERFORM 1 FROM public.species_reports WHERE id=ANY(p_report_ids) AND status='pending' AND lower(species_name)=lower(a.name) FOR UPDATE;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected=0 OR affected<>coalesce(array_length(p_report_ids,1),0) THEN RAISE EXCEPTION 'STALE_REPORT'; END IF;
 n:=a.name; s:=a.scientific_name; target_taxon:=a.taxon_id;
 IF p_action='merge' THEN
  SELECT * INTO b FROM public.animals WHERE id=p_target_id FOR UPDATE;
  IF b.id IS NULL OR b.id=a.id THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;
  -- A user may already own both cards: never delete either photo or weaken submission limits.
  IF EXISTS(SELECT 1 FROM public.captures x JOIN public.captures y ON x.user_id=y.user_id AND x.status=y.status WHERE lower(btrim(x.animal_name))=lower(btrim(a.name)) AND lower(btrim(y.animal_name))=lower(btrim(b.name)) AND x.status IN ('approved','pending_review')) THEN RAISE EXCEPTION 'MERGE_CAPTURE_CONFLICT'; END IF;
  IF (a.scientific_name IN ('Oedipoda germanica','Oedipoda caerulescens','Sphingonotus caerulans') AND b.scientific_name IN ('Oedipoda germanica','Oedipoda caerulescens','Sphingonotus caerulans') AND a.scientific_name<>b.scientific_name)
   OR (a.scientific_name IN ('Chorthippus binotatus','Omocestus viridulus') AND b.scientific_name IN ('Chorthippus binotatus','Omocestus viridulus') AND a.scientific_name<>b.scientific_name)
   OR (a.scientific_name IN ('Chrysiptera hemicyanea','Chrysiptera parasema') AND b.scientific_name IN ('Chrysiptera hemicyanea','Chrysiptera parasema') AND a.scientific_name<>b.scientific_name)
   OR (a.scientific_name IN ('Candoia paulsoni','Bothrochilus boa') AND b.scientific_name IN ('Candoia paulsoni','Bothrochilus boa') AND a.scientific_name<>b.scientific_name) THEN RAISE EXCEPTION 'DISTINCT_SPECIES'; END IF;
  n:=b.name; s:=b.scientific_name; target_taxon:=b.taxon_id;
 ELSE
  IF length(btrim(coalesce(p_value,''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF p_action='vernacular' THEN n:=btrim(p_value); ELSE s:=btrim(p_value); END IF;
  IF n=a.name AND s IS NOT DISTINCT FROM a.scientific_name THEN RAISE EXCEPTION 'NO_CHANGE'; END IF;
  IF EXISTS(SELECT 1 FROM public.animals z WHERE z.id<>a.id AND lower(z.name)=lower(n)) THEN RAISE EXCEPTION 'NAME_EXISTS'; END IF;
 END IF;
 batch:='report-action:'||gen_random_uuid()::text;
 INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data) VALUES(batch,'action',auth.uid()::text,jsonb_build_object('action',p_action,'value',p_value,'target',p_target_id,'reports',p_report_ids));
 INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data) SELECT batch,'animals',id::text,to_jsonb(z) FROM public.animals z WHERE id IN (a.id,b.id);
 INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data) SELECT batch,'captures',id::text,to_jsonb(z) FROM public.captures z WHERE lower(animal_name)=lower(a.name);
 INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data) SELECT batch,'species_profiles',id::text,to_jsonb(z) FROM public.species_profiles z WHERE animal_name IN (a.name,n);
 -- Resolve these exact reports before moving labels (avoids the one-pending-report unique index).
 UPDATE public.species_reports SET status='resolved' WHERE id=ANY(p_report_ids);
 UPDATE public.species_reports z SET status='dismissed' WHERE lower(z.species_name)=lower(a.name) AND z.status='pending' AND EXISTS(SELECT 1 FROM public.species_reports t WHERE t.user_id=z.user_id AND lower(t.species_name)=lower(n) AND t.id<>z.id AND t.status='pending');
 UPDATE public.species_reports SET species_name=n,scientific_name=s WHERE lower(species_name)=lower(a.name);
 IF p_action<>'merge' THEN
  DELETE FROM public.animal_merge_map WHERE lower(old_name)=lower(n);
  UPDATE public.taxa SET vernacular_name=n,scientific_name=s,updated_at=now() WHERE id=a.taxon_id AND (vernacular_name=a.name OR NOT EXISTS(SELECT 1 FROM public.animals z WHERE z.taxon_id=a.taxon_id AND z.id<>a.id));
  UPDATE public.animals SET name=n,scientific_name=s WHERE id=a.id;
  IF NOT EXISTS(SELECT 1 FROM public.animals WHERE id=a.id AND name=n AND scientific_name IS NOT DISTINCT FROM s) THEN RAISE EXCEPTION 'IDENTITY_CONFLICT'; END IF;
  UPDATE public.species_profiles SET animal_name=n,normalized_name=public.normalize_animal_label(n),scientific_name=s,normalized_scientific=public.normalize_animal_label(s),description_en=NULL,habitat_en=NULL,diet_en=NULL,fun_fact_en=NULL,translated_en_at=NULL,updated_at=now() WHERE animal_name=a.name;
  IF p_action='scientific' THEN DELETE FROM public.species_natural_history WHERE animal_id=a.id; END IF;
 ELSE
  -- Mark only a dedicated source taxon as merged; shared domestic taxa must remain intact.
  IF a.taxon_id IS NOT NULL AND target_taxon IS NOT NULL AND a.taxon_id<>target_taxon AND NOT EXISTS(SELECT 1 FROM public.animals z WHERE z.taxon_id=a.taxon_id AND z.id<>a.id) THEN
   UPDATE public.taxa SET merged_into=target_taxon,collectible=false,status='deprecated',updated_at=now() WHERE id=a.taxon_id;
   INSERT INTO public.collection_taxa(collection_id,taxon_id,is_core,created_at) SELECT collection_id,target_taxon,is_core,created_at FROM public.collection_taxa WHERE taxon_id=a.taxon_id ON CONFLICT(collection_id,taxon_id) DO NOTHING;
   DELETE FROM public.collection_taxa WHERE taxon_id=a.taxon_id;
   UPDATE public.animal_departments SET taxon_id=target_taxon WHERE taxon_id=a.taxon_id;
  END IF;
  INSERT INTO public.eclats_species_redirects(old_animal_id,new_animal_id,reason) VALUES(a.id,b.id,'report merge') ON CONFLICT(old_animal_id) DO UPDATE SET new_animal_id=excluded.new_animal_id;
  UPDATE public.eclats_species_redirects SET new_animal_id=b.id WHERE new_animal_id=a.id AND old_animal_id<>b.id;
  UPDATE public.ml_dataset_events SET animal_id=b.id,taxon_id=target_taxon WHERE animal_id=a.id;
 END IF;
 IF n<>a.name THEN
  UPDATE public.animal_merge_map SET new_name=n WHERE new_name=a.name AND old_name<>n;
  INSERT INTO public.animal_merge_map(old_name,new_name,mode) VALUES(a.name,n,'rename') ON CONFLICT(old_name) DO UPDATE SET new_name=excluded.new_name;
 END IF;
 UPDATE public.captures SET animal_name=n,scientific_name=s,taxon_id=target_taxon WHERE lower(animal_name)=lower(a.name);
 IF EXISTS(SELECT 1 FROM public.captures c JOIN public.catalogue_update_snapshots snap ON snap.batch_key=batch AND snap.relation_name='captures' AND snap.row_key=c.id::text WHERE c.animal_name<>n OR c.scientific_name IS DISTINCT FROM s OR c.image_url IS DISTINCT FROM snap.row_data->>'image_url') THEN RAISE EXCEPTION 'IDENTITY_CONFLICT'; END IF;
 DELETE FROM public.custom_collection_items z WHERE animal_name=a.name AND EXISTS(SELECT 1 FROM public.custom_collection_items t WHERE t.collection_id=z.collection_id AND t.animal_name=n AND t.id<>z.id);
 UPDATE public.custom_collection_items SET animal_name=n,scientific_name=s WHERE animal_name=a.name;
 INSERT INTO public.animal_departments(animal_name,department_code,created_at,taxon_id) SELECT n,department_code,created_at,target_taxon FROM public.animal_departments WHERE animal_name=a.name ON CONFLICT DO NOTHING;
 IF n<>a.name THEN DELETE FROM public.animal_departments WHERE animal_name=a.name; END IF;
 UPDATE public.themed_collections SET species_names=ARRAY(SELECT DISTINCT unnest(array_replace(species_names,a.name,n))) WHERE a.name=ANY(species_names);
 UPDATE public.species_pages SET animal_name=n,scientific_name=s,published=false,updated_at=now() WHERE animal_name=a.name;
 IF p_action='merge' THEN
  DELETE FROM public.species_profiles WHERE animal_name=a.name;
  DELETE FROM public.animals WHERE id=a.id;
 END IF;
 RETURN jsonb_build_object('name',n,'scientific_name',s,'batch',batch);
END $fn$;
REVOKE ALL ON FUNCTION public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid) TO authenticated,service_role;
COMMENT ON FUNCTION public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid) IS 'Admin-only transactional report corrections; preserves capture IDs/photos and refuses conflicting merges instead of discarding photos.';