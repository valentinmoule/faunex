SET LOCAL statement_timeout = '240s';

DO $$
DECLARE
  r record;
  v_clean text;
  v_dup uuid;
  v_users uuid[] := '{}';
BEGIN
  FOR r IN
    SELECT id, user_id, animal_name, status FROM public.captures
    WHERE animal_name LIKE '%(%' ORDER BY created_at
  LOOP
    v_clean := public.canonical_animal_name(r.animal_name);
    IF v_clean IS NULL OR v_clean = r.animal_name OR v_clean LIKE '%(%' THEN CONTINUE; END IF;

    IF NOT (r.user_id = ANY(v_users)) THEN
      v_users := v_users || r.user_id;
    END IF;

    SELECT c.id INTO v_dup
    FROM public.captures c
    WHERE c.user_id = r.user_id
      AND c.status = 'approved'
      AND lower(btrim(c.animal_name)) = lower(btrim(v_clean))
      AND c.id <> r.id
    ORDER BY c.created_at ASC LIMIT 1;

    IF v_dup IS NOT NULL AND r.status = 'approved' THEN
      DELETE FROM public.feed_likes WHERE capture_id = r.id;
      DELETE FROM public.feed_comments WHERE capture_id = r.id;
      DELETE FROM public.notifications WHERE capture_id = r.id;
      UPDATE public.ml_dataset_events SET capture_id = NULL WHERE capture_id = r.id;
      DELETE FROM public.captures WHERE id = r.id;
    ELSE
      UPDATE public.captures SET animal_name = v_clean WHERE id = r.id;
    END IF;
  END LOOP;

  FOR r IN SELECT unnest(v_users) AS uid LOOP
    PERFORM public.recompute_profile_counters(r.uid);
  END LOOP;
END $$;