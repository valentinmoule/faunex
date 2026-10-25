ALTER TABLE public.themed_collections ADD COLUMN event_kind text NOT NULL DEFAULT 'collection', ADD COLUMN calendar_year integer, ADD COLUMN calendar_days jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN final_badge_xp integer NOT NULL DEFAULT 300;
CREATE TABLE public.advent_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), collection_id uuid NOT NULL REFERENCES public.themed_collections(id), user_id uuid NOT NULL,
 day integer NOT NULL CHECK(day BETWEEN 1 AND 24), capture_id uuid NOT NULL, image_url text NOT NULL,
 submitted_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, approved_category text, claimed_at timestamptz,
 UNIQUE(collection_id,user_id,day,image_url)
);
GRANT SELECT ON public.advent_submissions TO authenticated;
GRANT ALL ON public.advent_submissions TO service_role;
ALTER TABLE public.advent_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY advent_owner_reads ON public.advent_submissions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX advent_owner_days ON public.advent_submissions(user_id,collection_id,day);
CREATE INDEX advent_capture_pending ON public.advent_submissions(capture_id) WHERE approved_at IS NULL;
CREATE OR REPLACE FUNCTION public.advent_day_start(p_year integer,p_day integer) RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT make_date(p_year,12,p_day)::timestamp AT TIME ZONE 'Europe/Paris' $$;
CREATE OR REPLACE FUNCTION public.advent_matches(p_categories jsonb,p_category text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT p_category IS NOT NULL AND btrim(p_category)<>'' AND (jsonb_array_length(p_categories)=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_categories) x WHERE x=regexp_replace(p_category,'\s*\(monde\)$','','i'))) $$;
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
  IF NEW.calendar_year IS NULL OR NEW.calendar_year NOT BETWEEN 2026 AND 2100 OR jsonb_typeof(NEW.calendar_days)<>'array' OR jsonb_array_length(NEW.calendar_days)<>24 OR NEW.final_badge_xp NOT BETWEEN 0 AND 500 THEN RAISE EXCEPTION 'invalid_calendar'; END IF;
  SELECT count(DISTINCT (x->>'day')::integer) INTO n FROM jsonb_array_elements(NEW.calendar_days) x;
  IF n<>24 THEN RAISE EXCEPTION 'invalid_calendar_days'; END IF;
  FOR d IN SELECT value FROM jsonb_array_elements(NEW.calendar_days) LOOP
   IF (d->>'day')::integer NOT BETWEEN 1 AND 24 OR nullif(btrim(d->>'title'),'') IS NULL OR jsonb_typeof(d->'categories')<>'array' OR (d->>'xp')::integer NOT BETWEEN 0 AND 500 OR d->>'xp' IS NULL THEN RAISE EXCEPTION 'invalid_challenge'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'categories') c WHERE c NOT IN ('Mammifères','Oiseaux','Reptiles','Amphibiens','Poissons','Insectes','Arachnides','Crustacés','Mollusques','Échinodermes','Cnidaires','Autres invertébrés')) THEN RAISE EXCEPTION 'invalid_challenge_category'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER themed_advent_config BEFORE INSERT OR UPDATE OR DELETE ON public.themed_collections FOR EACH ROW EXECUTE FUNCTION public.guard_advent_configuration();
CREATE OR REPLACE FUNCTION public.track_advent_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.themed_collections; d jsonb; v_day integer; fresh boolean:=false; path text; starts timestamptz;
BEGIN
 -- Only a genuinely new storage object from the capture flow, never a crop or correction, reserves a day.
 IF TG_OP='INSERT' THEN fresh:=true; ELSE fresh:=NEW.image_url IS DISTINCT FROM OLD.image_url; END IF;
 IF NEW.correction_requested_at IS NOT NULL THEN fresh:=false; END IF;
 v_day:=extract(day FROM now() AT TIME ZONE 'Europe/Paris');
 IF fresh AND extract(month FROM now() AT TIME ZONE 'Europe/Paris')=12 AND v_day BETWEEN 1 AND 24 THEN
  path:=substring(NEW.image_url FROM '/object/public/captures/(.*)$');
  -- Existing clients use timestamp filenames; new clients mark observation uploads explicitly. Crop uploads use UUID filenames.
  IF path ~ ('^'||NEW.user_id::text||'/(observations/[0-9a-f-]+|[0-9]+)\.jpg$') AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='captures' AND o.name=path AND o.created_at>=date_trunc('day',now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris') THEN
   FOR c IN SELECT * FROM public.themed_collections WHERE published AND event_kind='advent' AND calendar_year=extract(year FROM now() AT TIME ZONE 'Europe/Paris') AND (starts_at IS NULL OR starts_at<=now()) LOOP
    INSERT INTO public.advent_submissions(collection_id,user_id,day,capture_id,image_url) VALUES(c.id,NEW.user_id,v_day,NEW.id,NEW.image_url) ON CONFLICT DO NOTHING;
   END LOOP;
  END IF;
 END IF;
 IF NEW.status='approved' AND NEW.correction_requested_at IS NULL THEN
  UPDATE public.advent_submissions s SET approved_at=now(),approved_category=NEW.category
  FROM public.themed_collections t,jsonb_array_elements(t.calendar_days) d
  WHERE s.capture_id=NEW.id AND s.user_id=NEW.user_id AND s.image_url=NEW.image_url AND s.approved_at IS NULL AND t.id=s.collection_id
   AND (d->>'day')::integer=s.day AND s.submitted_at>=public.advent_day_start(t.calendar_year,s.day) AND s.submitted_at<public.advent_day_start(t.calendar_year,s.day)+interval '1 day'
   AND public.advent_matches(d->'categories',NEW.category);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zzzz_advent_observation AFTER INSERT OR UPDATE OF image_url,status,category,correction_requested_at ON public.captures FOR EACH ROW EXECUTE FUNCTION public.track_advent_capture();
CREATE OR REPLACE FUNCTION public.claim_advent_day(p_collection uuid,p_day integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.advent_submissions; xp integer; u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('reward:'||u::text,0));
 IF EXISTS(SELECT 1 FROM public.advent_submissions WHERE collection_id=p_collection AND user_id=u AND day=p_day AND claimed_at IS NOT NULL) THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.advent_submissions WHERE collection_id=p_collection AND user_id=u AND day=p_day AND approved_at IS NOT NULL ORDER BY submitted_at,id LIMIT 1 FOR UPDATE;
 IF s.id IS NULL THEN RETURN NULL; END IF;
 SELECT (d->>'xp')::integer INTO xp FROM public.themed_collections t,jsonb_array_elements(t.calendar_days) d WHERE t.id=p_collection AND (d->>'day')::integer=p_day;
 IF xp IS NULL THEN RETURN NULL; END IF;
 UPDATE public.advent_submissions SET claimed_at=now() WHERE id=s.id;
 PERFORM public.grant_xp(u,xp); RETURN xp;
END $$;
CREATE OR REPLACE FUNCTION public.my_advent_calendars() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('now',now(),'collections',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.sort_order,t.created_at) FROM public.themed_collections t WHERE t.event_kind='advent' AND (t.published OR public.has_role(auth.uid(),'admin'))),'[]'::jsonb),'submissions',coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM public.advent_submissions s WHERE s.user_id=auth.uid()),'[]'::jsonb))
$$;
CREATE OR REPLACE FUNCTION public.advent_badge_progress(p_user uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id','advent_'||t.id,'title',t.title,'title_en',t.title_en,'year',t.calendar_year,'xp',t.final_badge_xp,'progress',p.days)),'[]'::jsonb)
 FROM public.themed_collections t JOIN (SELECT collection_id,count(DISTINCT day) days FROM public.advent_submissions WHERE user_id=p_user AND approved_at IS NOT NULL GROUP BY collection_id) p ON p.collection_id=t.id
 WHERE auth.uid() IS NOT NULL AND (t.published OR EXISTS(SELECT 1 FROM public.user_badges WHERE user_id=p_user AND badge_id='advent_'||t.id))
$$;
DO $outer$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.reward_eligibility(text,text)'::regprocedure) INTO def;
 def:=replace(def,'SELECT definition->p_badge_id INTO rule', E'IF starts_with(p_badge_id,\'advent_\') THEN\n SELECT final_badge_xp INTO xp FROM public.themed_collections t WHERE \'advent_\'||t.id=p_badge_id AND t.event_kind=\'advent\' AND (SELECT count(DISTINCT day) FROM public.advent_submissions WHERE collection_id=t.id AND user_id=u AND approved_at IS NOT NULL)=24;\n RETURN xp;\n END IF;\n SELECT definition->p_badge_id INTO rule');
 EXECUTE def;
END $outer$;
REVOKE ALL ON FUNCTION public.advent_day_start(integer,integer),public.advent_matches(jsonb,text),public.guard_advent_configuration(),public.track_advent_capture(),public.claim_advent_day(uuid,integer),public.my_advent_calendars(),public.advent_badge_progress(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_advent_day(uuid,integer),public.my_advent_calendars(),public.advent_badge_progress(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.advent_day_start(integer,integer),public.advent_matches(jsonb,text) TO service_role;