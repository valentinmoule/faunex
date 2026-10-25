CREATE OR REPLACE FUNCTION public.guard_advent_configuration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d jsonb; n integer;
BEGIN
 IF TG_OP='DELETE' THEN
  IF EXISTS(SELECT 1 FROM public.advent_submissions WHERE collection_id=OLD.id) THEN RAISE EXCEPTION 'calendar_has_participants'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.event_kind,NEW.calendar_year,NEW.calendar_days,NEW.final_badge_xp) IS DISTINCT FROM ROW(OLD.event_kind,OLD.calendar_year,OLD.calendar_days,OLD.final_badge_xp) AND EXISTS(SELECT 1 FROM public.advent_submissions WHERE collection_id=OLD.id) THEN RAISE EXCEPTION 'calendar_rules_locked'; END IF;
 IF NEW.event_kind NOT IN ('collection','advent') THEN RAISE EXCEPTION 'invalid_event_kind'; END IF;
 IF NEW.event_kind='advent' THEN
  IF NEW.calendar_year IS NULL OR NEW.calendar_year NOT BETWEEN 2026 AND 2100 OR NEW.final_badge_xp NOT BETWEEN 0 AND 500 THEN RAISE EXCEPTION 'invalid_calendar'; END IF;
  IF jsonb_typeof(NEW.calendar_days) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_calendar_days'; END IF;
  IF jsonb_array_length(NEW.calendar_days)<>24 THEN RAISE EXCEPTION 'invalid_calendar_days'; END IF;
  FOR d IN SELECT value FROM jsonb_array_elements(NEW.calendar_days) LOOP
   IF jsonb_typeof(d) IS DISTINCT FROM 'object' OR jsonb_typeof(d->'day') IS DISTINCT FROM 'number' OR jsonb_typeof(d->'xp') IS DISTINCT FROM 'number' OR coalesce(d->>'day','') !~ '^[0-9]{1,2}$' OR coalesce(d->>'xp','') !~ '^[0-9]{1,3}$' OR jsonb_typeof(d->'categories') IS DISTINCT FROM 'array' OR jsonb_typeof(d->'title') IS DISTINCT FROM 'string' OR coalesce(btrim(d->>'title'),'')='' THEN RAISE EXCEPTION 'invalid_challenge'; END IF;
   IF (d->>'day')::integer NOT BETWEEN 1 AND 24 OR (d->>'xp')::integer NOT BETWEEN 0 AND 500 THEN RAISE EXCEPTION 'invalid_challenge'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'categories') c WHERE jsonb_typeof(c) IS DISTINCT FROM 'string') OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'categories') c WHERE c NOT IN ('Mammifères','Oiseaux','Reptiles','Amphibiens','Poissons','Insectes','Arachnides','Crustacés','Mollusques','Échinodermes','Cnidaires','Autres invertébrés')) THEN RAISE EXCEPTION 'invalid_challenge_category'; END IF;
  END LOOP;
  SELECT count(DISTINCT (x->>'day')::integer) INTO n FROM jsonb_array_elements(NEW.calendar_days) x;
  IF n<>24 THEN RAISE EXCEPTION 'invalid_calendar_days'; END IF;
 END IF;
 RETURN NEW;
END $$;
DO $outer$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.track_advent_capture()'::regprocedure) INTO def;
 def:=replace(def,'IF path ~', E'IF NEW.image_url LIKE \'https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/captures/%\' AND path ~');
 def:=replace(def,'o.created_at>=date_trunc', E'o.created_at<((date_trunc(\'day\',now() AT TIME ZONE \'Europe/Paris\')+interval \'1 day\') AT TIME ZONE \'Europe/Paris\') AND o.created_at>=date_trunc');
 EXECUTE def;
END $outer$;
GRANT EXECUTE ON FUNCTION public.advent_day_start(integer,integer),public.advent_matches(jsonb,text) TO authenticated;
