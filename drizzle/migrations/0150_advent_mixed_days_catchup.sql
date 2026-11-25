CREATE TABLE public.advent_quiz_answers (
  collection_id uuid NOT NULL,
  day integer NOT NULL,
  answer integer NOT NULL,
  PRIMARY KEY (collection_id, day)
);
GRANT ALL ON public.advent_quiz_answers TO service_role;
ALTER TABLE public.advent_quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.advent_day_kind(d jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT coalesce(nullif(d->>'kind',''),'photo') $$;

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
   IF public.advent_day_kind(d) NOT IN ('photo','gift','quiz','badge') THEN RAISE EXCEPTION 'invalid_challenge_kind'; END IF;
   IF public.advent_day_kind(d)='quiz' AND (jsonb_typeof(d->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(d->'options')<2 OR d ? 'answer') THEN RAISE EXCEPTION 'invalid_quiz'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'categories') c WHERE jsonb_typeof(c) IS DISTINCT FROM 'string') OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'categories') c WHERE c NOT IN ('Mammifères','Oiseaux','Reptiles','Amphibiens','Poissons','Insectes','Arachnides','Crustacés','Mollusques','Échinodermes','Cnidaires','Autres invertébrés')) THEN RAISE EXCEPTION 'invalid_challenge_category'; END IF;
  END LOOP;
  SELECT count(DISTINCT (x->>'day')::integer) INTO n FROM jsonb_array_elements(NEW.calendar_days) x;
  IF n<>24 THEN RAISE EXCEPTION 'invalid_calendar_days'; END IF;
 END IF;
 RETURN NEW;
END $$;

-- Photos taken any day from Dec 1 to 24 can fill today's photo challenge or catch up an earlier one.
CREATE OR REPLACE FUNCTION public.track_advent_capture()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.themed_collections; v_day integer; fresh boolean:=false; path text; target integer; s record; pick integer;
BEGIN
 IF TG_OP='INSERT' THEN fresh:=true; ELSE fresh:=NEW.image_url IS DISTINCT FROM OLD.image_url; END IF;
 IF NEW.correction_requested_at IS NOT NULL THEN fresh:=false; END IF;
 v_day:=extract(day FROM now() AT TIME ZONE 'Europe/Paris');
 IF fresh AND extract(month FROM now() AT TIME ZONE 'Europe/Paris')=12 AND v_day BETWEEN 1 AND 24 THEN
  path:=substring(NEW.image_url FROM '/object/public/captures/(.*)$');
  IF NEW.image_url LIKE 'https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/captures/%' AND path ~ ('^'||NEW.user_id::text||'/(observations/[0-9a-f-]+|[0-9]+)\.jpg$') AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='captures' AND o.name=path AND o.created_at<((date_trunc('day',now() AT TIME ZONE 'Europe/Paris')+interval '1 day') AT TIME ZONE 'Europe/Paris') AND o.created_at>=date_trunc('day',now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris') THEN
   FOR c IN SELECT * FROM public.themed_collections WHERE published AND event_kind='advent' AND calendar_year=extract(year FROM now() AT TIME ZONE 'Europe/Paris') AND (starts_at IS NULL OR starts_at<=now()) LOOP
    SELECT (dd->>'day')::integer INTO target FROM jsonb_array_elements(c.calendar_days) dd
     WHERE public.advent_day_kind(dd)='photo' AND (dd->>'day')::integer<=v_day
      AND NOT EXISTS(SELECT 1 FROM public.advent_submissions x WHERE x.collection_id=c.id AND x.user_id=NEW.user_id AND x.day=(dd->>'day')::integer AND x.approved_at IS NOT NULL)
     ORDER BY ((dd->>'day')::integer=v_day) DESC,(dd->>'day')::integer LIMIT 1;
    IF target IS NOT NULL THEN
     INSERT INTO public.advent_submissions(collection_id,user_id,day,capture_id,image_url) VALUES(c.id,NEW.user_id,target,NEW.id,NEW.image_url) ON CONFLICT DO NOTHING;
    END IF;
   END LOOP;
  END IF;
 END IF;
 IF NEW.status='approved' AND NEW.correction_requested_at IS NULL THEN
  FOR s IN SELECT x.*, t.calendar_days, t.calendar_year FROM public.advent_submissions x JOIN public.themed_collections t ON t.id=x.collection_id
    WHERE x.capture_id=NEW.id AND x.user_id=NEW.user_id AND x.image_url=NEW.image_url AND x.approved_at IS NULL LOOP
   v_day:=extract(day FROM s.submitted_at AT TIME ZONE 'Europe/Paris');
   SELECT (dd->>'day')::integer INTO pick FROM jsonb_array_elements(s.calendar_days) dd
    WHERE public.advent_day_kind(dd)='photo' AND (dd->>'day')::integer<=v_day
     AND public.advent_matches(dd->'categories',NEW.category)
     AND NOT EXISTS(SELECT 1 FROM public.advent_submissions y WHERE y.collection_id=s.collection_id AND y.user_id=s.user_id AND y.day=(dd->>'day')::integer AND y.approved_at IS NOT NULL)
    ORDER BY ((dd->>'day')::integer=s.day) DESC,((dd->>'day')::integer=v_day) DESC,(dd->>'day')::integer LIMIT 1;
   IF pick IS NULL OR s.submitted_at<public.advent_day_start(s.calendar_year,1) OR s.submitted_at>=public.advent_day_start(s.calendar_year,24)+interval '1 day' THEN
    DELETE FROM public.advent_submissions WHERE id=s.id;
   ELSE
    UPDATE public.advent_submissions SET day=pick,approved_at=now(),approved_category=NEW.category WHERE id=s.id;
   END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $function$;

DROP FUNCTION IF EXISTS public.claim_advent_day(uuid,integer);
CREATE FUNCTION public.claim_advent_day(p_collection uuid,p_day integer,p_answer integer DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.advent_submissions; t public.themed_collections; d jsonb; kind text; xp integer; u uuid:=auth.uid(); n integer; ok integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('reward:'||u::text,0));
 SELECT * INTO t FROM public.themed_collections WHERE id=p_collection AND event_kind='advent' AND published;
 IF t.id IS NULL THEN RETURN NULL; END IF;
 SELECT x INTO d FROM jsonb_array_elements(t.calendar_days) x WHERE (x->>'day')::integer=p_day;
 IF d IS NULL THEN RETURN NULL; END IF;
 kind:=public.advent_day_kind(d); xp:=(d->>'xp')::integer;
 IF EXISTS(SELECT 1 FROM public.advent_submissions WHERE collection_id=p_collection AND user_id=u AND day=p_day AND claimed_at IS NOT NULL) THEN RETURN NULL; END IF;
 IF kind='photo' THEN
  SELECT * INTO s FROM public.advent_submissions WHERE collection_id=p_collection AND user_id=u AND day=p_day AND approved_at IS NOT NULL ORDER BY submitted_at,id LIMIT 1 FOR UPDATE;
  IF s.id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.advent_submissions SET claimed_at=now() WHERE id=s.id;
  PERFORM public.grant_xp(u,xp); RETURN xp;
 END IF;
 -- Instant cases open from their day until the end of December 24 (catch-up allowed).
 IF now()<public.advent_day_start(t.calendar_year,p_day) OR now()>=public.advent_day_start(t.calendar_year,24)+interval '1 day' THEN RETURN NULL; END IF;
 IF kind='quiz' THEN
  SELECT answer INTO ok FROM public.advent_quiz_answers WHERE collection_id=p_collection AND day=p_day;
  IF ok IS NULL OR p_answer IS DISTINCT FROM ok THEN RETURN -1; END IF;
 ELSIF kind='badge' THEN
  SELECT count(DISTINCT day) INTO n FROM public.advent_submissions WHERE collection_id=p_collection AND user_id=u AND approved_at IS NOT NULL AND day<>p_day;
  IF n<23 THEN RETURN NULL; END IF;
 END IF;
 INSERT INTO public.advent_submissions(collection_id,user_id,day,capture_id,image_url,approved_at,approved_category,claimed_at)
  VALUES(p_collection,u,p_day,gen_random_uuid(),'advent:'||kind,now(),kind,now());
 IF xp>0 THEN PERFORM public.grant_xp(u,xp); END IF;
 RETURN xp;
END $$;
REVOKE ALL ON FUNCTION public.claim_advent_day(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_advent_day(uuid,integer,integer) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.advent_day_kind(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.advent_day_kind(jsonb) TO authenticated,service_role;