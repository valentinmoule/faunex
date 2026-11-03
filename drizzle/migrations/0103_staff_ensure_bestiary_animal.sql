CREATE OR REPLACE FUNCTION public.staff_ensure_bestiary_animal(p_name text, p_scientific text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, scientific_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid; v_name text; v_sci text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
 v_name := btrim(coalesce(p_name,''));
 IF v_name = '' THEN RAISE EXCEPTION 'STALE_SPECIES'; END IF;
 SELECT a.id INTO v_id FROM public.animals a WHERE lower(btrim(a.name)) = lower(v_name) ORDER BY (a.name = v_name) DESC LIMIT 1;
 IF v_id IS NULL THEN
  SELECT c.animal_name, c.scientific_name INTO v_name, v_sci FROM public.captures c
   WHERE lower(btrim(c.animal_name)) = lower(v_name) AND c.status IN ('approved','pending_review')
   ORDER BY c.created_at DESC LIMIT 1;
  IF v_name IS NULL THEN RAISE EXCEPTION 'STALE_SPECIES'; END IF;
  v_sci := coalesce(nullif(btrim(v_sci),''), nullif(btrim(p_scientific),''));
  PERFORM set_config('faunex.force_identity','on',true);
  INSERT INTO public.animals(name, scientific_name) VALUES (v_name, v_sci) RETURNING animals.id INTO v_id;
  PERFORM set_config('faunex.force_identity','',true);
 END IF;
 RETURN QUERY SELECT a.id, a.name, a.scientific_name FROM public.animals a WHERE a.id = v_id;
END $$;
REVOKE ALL ON FUNCTION public.staff_ensure_bestiary_animal(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_ensure_bestiary_animal(text, text) TO authenticated, service_role;