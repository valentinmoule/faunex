CREATE OR REPLACE FUNCTION public.reclassify_generic_capture_to_reference(p_capture_id uuid, p_target_id uuid, p_batch text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.captures%ROWTYPE; a public.animals%ROWTYPE; owner_id uuid;
  bx integer; bl integer; ax integer; al integer; bc bigint;
BEGIN
  SELECT user_id INTO owner_id FROM public.captures WHERE id=p_capture_id;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Capture not found'; END IF;
  SELECT xp,level INTO bx,bl FROM public.profiles WHERE user_id=owner_id FOR UPDATE;
  SELECT * INTO c FROM public.captures WHERE id=p_capture_id FOR UPDATE;
  SELECT * INTO a FROM public.animals WHERE id=p_target_id FOR SHARE;
  IF a.id IS NULL OR a.scientific_name !~ '^[A-Z][a-z]+ [a-z]+$' OR a.scientific_name ~ '\s(spp?|cf|aff)$'
    OR public.is_reclassification_group_label(a.name,a.scientific_name) THEN
    RAISE EXCEPTION 'Target must be an existing precise species' USING ERRCODE='23514';
  END IF;
  IF c.status<>'approved' THEN RAISE EXCEPTION 'Only approved photos' USING ERRCODE='23514'; END IF;
  IF c.animal_name=a.name THEN RETURN jsonb_build_object('result','already_applied'); END IF;
  INSERT INTO public.catalogue_update_snapshots(batch_key,relation_name,row_key,row_data,created_at)
    VALUES(p_batch,'captures',c.id::text,to_jsonb(c),now()),
      (p_batch,'progression',owner_id::text,jsonb_build_object('xp',bx,'level',bl),now()) ON CONFLICT DO NOTHING;
  SELECT count(*) INTO bc FROM public.captures WHERE user_id=owner_id;
  PERFORM set_config('faunex.force_identity','on',true);
  UPDATE public.captures SET animal_name=a.name, scientific_name=a.scientific_name WHERE id=c.id;
  PERFORM set_config('faunex.force_identity','',true);
  SELECT xp,level INTO ax,al FROM public.profiles WHERE user_id=owner_id;
  IF bx IS DISTINCT FROM ax OR bl IS DISTINCT FROM al
    OR bc<>(SELECT count(*) FROM public.captures WHERE user_id=owner_id)
    OR NOT EXISTS(SELECT 1 FROM public.captures WHERE id=c.id AND animal_name=a.name
      AND image_url IS NOT DISTINCT FROM c.image_url AND status=c.status AND xp_awarded IS NOT DISTINCT FROM c.xp_awarded) THEN
    RAISE EXCEPTION 'Reclassification must preserve photos and progression';
  END IF;
  RETURN jsonb_build_object('result','reclassified','name',a.name);
END $$;
REVOKE ALL ON FUNCTION public.reclassify_generic_capture_to_reference(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclassify_generic_capture_to_reference(uuid,uuid,text) TO service_role;