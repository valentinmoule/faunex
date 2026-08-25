SET LOCAL statement_timeout = '240s';

DO $$
DECLARE
  r record;
  v_target uuid;
  v_clean text;
BEGIN
  FOR r IN
    SELECT id, name FROM public.animals WHERE name LIKE '%(%' ORDER BY created_at
  LOOP
    v_clean := public.canonical_animal_name(r.name);
    IF v_clean IS NULL OR v_clean = r.name OR v_clean LIKE '%(%' THEN CONTINUE; END IF;

    SELECT b.id INTO v_target
    FROM public.animals b
    WHERE lower(b.name) = lower(v_clean) AND b.id <> r.id
    ORDER BY b.created_at ASC LIMIT 1;

    IF v_target IS NOT NULL THEN
      INSERT INTO public.animal_merge_map (old_name, new_name, mode)
      VALUES (r.name, (SELECT name FROM public.animals WHERE id = v_target), 'rename')
      ON CONFLICT DO NOTHING;
      UPDATE public.ml_dataset_events SET animal_id = v_target WHERE animal_id = r.id;
      DELETE FROM public.animals WHERE id = r.id;
    ELSE
      UPDATE public.animals SET name = v_clean WHERE id = r.id;
      INSERT INTO public.animal_merge_map (old_name, new_name, mode)
      VALUES (r.name, v_clean, 'rename')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;