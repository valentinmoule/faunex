CREATE OR REPLACE FUNCTION public.track_advent_capture()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.themed_collections; v_day integer; fresh boolean:=false; path text;
BEGIN
 IF TG_OP='INSERT' THEN fresh:=true; ELSE fresh:=NEW.image_url IS DISTINCT FROM OLD.image_url; END IF;
 IF NEW.correction_requested_at IS NOT NULL THEN fresh:=false; END IF;
 v_day:=extract(day FROM now() AT TIME ZONE 'Europe/Paris');
 IF fresh AND extract(month FROM now() AT TIME ZONE 'Europe/Paris')=12 AND v_day BETWEEN 1 AND 24 THEN
  path:=substring(NEW.image_url FROM '/object/public/captures/(.*)$');
  IF NEW.image_url LIKE 'https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/captures/%' AND path ~ ('^'||NEW.user_id::text||'/(observations/[0-9a-f-]+|[0-9]+)\.jpg$') AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='captures' AND o.name=path AND o.created_at<((date_trunc('day',now() AT TIME ZONE 'Europe/Paris')+interval '1 day') AT TIME ZONE 'Europe/Paris') AND o.created_at>=date_trunc('day',now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris') THEN
   FOR c IN SELECT * FROM public.themed_collections WHERE published AND event_kind='advent' AND calendar_year=extract(year FROM now() AT TIME ZONE 'Europe/Paris') AND (starts_at IS NULL OR starts_at<=now()) LOOP
    INSERT INTO public.advent_submissions(collection_id,user_id,day,capture_id,image_url) VALUES(c.id,NEW.user_id,v_day,NEW.id,NEW.image_url) ON CONFLICT DO NOTHING;
   END LOOP;
  END IF;
 END IF;
 IF NEW.status='approved' AND NEW.correction_requested_at IS NULL THEN
  UPDATE public.advent_submissions s SET approved_at=now(),approved_category=NEW.category
  FROM public.themed_collections t,jsonb_array_elements(t.calendar_days) dd
  WHERE s.capture_id=NEW.id AND s.user_id=NEW.user_id AND s.image_url=NEW.image_url AND s.approved_at IS NULL AND t.id=s.collection_id
   AND (dd->>'day')::integer=s.day AND s.submitted_at>=public.advent_day_start(t.calendar_year,s.day) AND s.submitted_at<public.advent_day_start(t.calendar_year,s.day)+interval '1 day'
   AND public.advent_matches(dd->'categories',NEW.category);
 END IF;
 RETURN NEW;
END $function$;