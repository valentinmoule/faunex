DO $do$
DECLARE src text;
BEGIN
 SELECT pg_get_functiondef('public.staff_ensure_bestiary_animal(text,text)'::regprocedure) INTO src;
 src := replace(src, '   IF v_id IS NULL AND v_sci IS NOT NULL THEN',
  '   IF v_id IS NULL THEN
    SELECT a.id INTO v_id FROM public.animals a WHERE public.normalize_animal_label(a.name) = public.normalize_animal_label(v_orphan) LIMIT 1;
   END IF;
   IF v_id IS NULL AND v_sci IS NOT NULL THEN');
 EXECUTE src;
END $do$;