ALTER TABLE public.quest_templates DROP CONSTRAINT quest_templates_period_check;
ALTER TABLE public.quest_templates ADD CONSTRAINT quest_templates_period_check CHECK (period = ANY (ARRAY['week','day','premium']));

INSERT INTO public.quest_templates (code, quest_type, title, description, icon, target, xp_reward, difficulty, period, active) VALUES
 ('premium_rare_3','capture_rarity','Expédition d''élite','Capture 3 espèces rares ou plus cette semaine','sparkles',3,400,3,'premium',true),
 ('premium_different_10','capture_different','Grand inventaire','Capture 10 espèces différentes cette semaine','sparkles',10,450,3,'premium',true),
 ('premium_zone_4','new_zone','Carnet de route','Capture dans 4 lieux différents cette semaine','sparkles',4,400,3,'premium',true)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.premium_quest_template(p_week date DEFAULT (date_trunc('week', CURRENT_DATE))::date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v uuid;
BEGIN
  SELECT template_id INTO v FROM public.weekly_quest_draw WHERE week_start = p_week AND slot = 5;
  IF v IS NOT NULL THEN RETURN v; END IF;
  INSERT INTO public.weekly_quest_draw (week_start, slot, template_id)
  SELECT p_week, 5, t.id FROM public.quest_templates t WHERE t.active AND t.period = 'premium'
  ORDER BY md5(t.id::text || p_week::text) LIMIT 1 ON CONFLICT DO NOTHING;
  SELECT template_id INTO v FROM public.weekly_quest_draw WHERE week_start = p_week AND slot = 5;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.premium_quest_preview()
RETURNS TABLE(title text, description text, target integer, xp_reward integer, quest_type text)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT t.title, t.description, t.target, t.xp_reward, t.quest_type FROM public.quest_templates t
  WHERE auth.uid() IS NOT NULL AND t.id = public.premium_quest_template();
$$;
GRANT EXECUTE ON FUNCTION public.premium_quest_preview() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.premium_quest_template(date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_weekly_quests_for(p_user_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_week date := date_trunc('week', CURRENT_DATE)::date; v_today date := CURRENT_DATE; v_n integer := 0; v_c integer; v_p uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;
  PERFORM public.draw_weekly_quests(v_week);
  DELETE FROM public.daily_quests q USING public.quest_templates t
  WHERE q.template_id = t.id AND q.user_id = p_user_id
    AND (((t.period = 'week' OR t.period = 'premium') AND q.quest_date <> v_week) OR (t.period = 'day' AND q.quest_date <> v_today));
  INSERT INTO public.daily_quests (user_id, template_id, quest_date, progress, completed, claimed)
  SELECT p_user_id, d.template_id, v_week, 0, false, false FROM public.weekly_quest_draw d
  JOIN public.quest_templates t ON t.id = d.template_id AND t.period = 'week'
  WHERE d.week_start = v_week ON CONFLICT (user_id, quest_date, template_id) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF public.is_premium(p_user_id) THEN
    v_p := public.premium_quest_template(v_week);
    IF v_p IS NOT NULL THEN
      INSERT INTO public.daily_quests (user_id, template_id, quest_date, progress, completed, claimed)
      VALUES (p_user_id, v_p, v_week, 0, false, false) ON CONFLICT (user_id, quest_date, template_id) DO NOTHING;
      GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.daily_quests q JOIN public.quest_templates t ON t.id = q.template_id
                 WHERE q.user_id = p_user_id AND t.period = 'day' AND q.quest_date = v_today) THEN
    INSERT INTO public.daily_quests (user_id, template_id, quest_date, progress, completed, claimed)
    SELECT p_user_id, t.id, v_today, 0, false, false FROM public.quest_templates t
    WHERE t.active AND t.period = 'day' ORDER BY md5(t.id::text || v_today::text) LIMIT 1
    ON CONFLICT (user_id, quest_date, template_id) DO NOTHING;
    GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  END IF;
  RETURN v_n;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_quest_progress()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE q RECORD; v_new integer; v_s timestamptz; v_e timestamptz;
BEGIN
 IF NEW.status<>'approved' THEN RETURN NEW; END IF;
 FOR q IN SELECT d.id,d.progress,d.quest_date,t.quest_type,t.target,t.period FROM public.daily_quests d JOIN public.quest_templates t ON t.id=d.template_id
   WHERE d.user_id=NEW.user_id AND d.completed=false
     AND ((t.period IN ('week','premium') AND d.quest_date=date_trunc('week',CURRENT_DATE)::date) OR (t.period='day' AND d.quest_date=CURRENT_DATE)) LOOP
  v_s := q.quest_date; v_e := q.quest_date + CASE WHEN q.period='day' THEN interval '1 day' ELSE interval '7 days' END;
  v_new := q.progress;
  CASE q.quest_type
  WHEN 'capture_count' THEN
   SELECT GREATEST(count(*),q.progress) INTO v_new FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_s AND created_at<v_e;
  WHEN 'capture_different' THEN
   SELECT count(DISTINCT animal_name) INTO v_new FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_s AND created_at<v_e;
  WHEN 'capture_rarity' THEN
   SELECT GREATEST(count(DISTINCT lower(animal_name)),q.progress) INTO v_new FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_s AND created_at<v_e AND rarity NOT IN ('common','uncommon');
  WHEN 'new_zone' THEN
   SELECT count(DISTINCT location) INTO v_new FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_s AND created_at<v_e AND location IS NOT NULL AND location<>'';
  ELSE NULL;
  END CASE;
  v_new := LEAST(v_new,q.target);
  IF v_new<>q.progress THEN UPDATE public.daily_quests SET progress=v_new,completed=(v_new>=q.target) WHERE id=q.id; END IF;
 END LOOP;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.claim_quest_reward(p_quest_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_xp integer;
BEGIN
  UPDATE public.daily_quests d SET claimed = true FROM public.quest_templates t
  WHERE d.id = p_quest_id AND d.template_id = t.id AND d.user_id = auth.uid()
    AND d.completed = true AND d.claimed = false
    AND (t.period <> 'premium' OR public.is_premium(auth.uid()))
  RETURNING t.xp_reward INTO v_xp;
  IF v_xp IS NULL THEN RETURN false; END IF;
  PERFORM public.grant_xp(auth.uid(), v_xp);
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_weekly_chest(p_week date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_total int; v_open int; v_xp int := 50;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('chest:' || v_uid::text));
  SELECT count(*), count(*) FILTER (WHERE NOT q.claimed) INTO v_total, v_open
  FROM public.daily_quests q JOIN public.quest_templates t ON t.id = q.template_id
  WHERE q.user_id = v_uid AND q.quest_date = p_week AND t.period <> 'premium';
  IF v_total = 0 OR v_open > 0 THEN RETURN 0; END IF;
  INSERT INTO public.weekly_chest_claims(user_id, week_start, xp) VALUES (v_uid, p_week, v_xp)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  PERFORM public.grant_xp(v_uid, v_xp);
  RETURN v_xp;
END; $function$;

CREATE OR REPLACE FUNCTION public.rare_sightings_near(p_lat double precision, p_lng double precision, p_radius_km double precision DEFAULT 10)
RETURNS TABLE(animal_name text, scientific_name text, category text, rarity text, lat double precision, lng double precision, distance_km double precision, seen_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_r double precision := LEAST(GREATEST(coalesce(p_radius_km,10),1),30);
BEGIN
  IF v_uid IS NULL OR NOT public.is_premium(v_uid) THEN RETURN; END IF;
  RETURN QUERY
  SELECT DISTINCT ON (lower(c.animal_name)) c.animal_name, c.scientific_name, c.category, c.rarity,
    round(c.latitude::numeric, 2)::double precision, round(c.longitude::numeric, 2)::double precision,
    round((6371 * 2 * asin(sqrt(power(sin(radians(c.latitude - p_lat)/2),2) + cos(radians(p_lat))*cos(radians(c.latitude))*power(sin(radians(c.longitude - p_lng)/2),2))))::numeric, 1)::double precision AS d,
    c.created_at
  FROM public.captures c
  WHERE c.status = 'approved' AND c.shared = true AND c.user_id <> v_uid
    AND c.created_at > now() - interval '72 hours'
    AND c.rarity NOT IN ('common','uncommon')
    AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    AND c.latitude BETWEEN p_lat - v_r/111.0 AND p_lat + v_r/111.0
    AND c.longitude BETWEEN p_lng - v_r/(111.0*greatest(cos(radians(p_lat)),0.1)) AND p_lng + v_r/(111.0*greatest(cos(radians(p_lat)),0.1))
    AND NOT EXISTS (SELECT 1 FROM public.captures m WHERE m.user_id = v_uid AND m.status = 'approved' AND lower(m.animal_name) = lower(c.animal_name))
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id AND u.email = 'valentinmoulay+test@gmail.com')
  ORDER BY lower(c.animal_name), c.created_at DESC
  LIMIT 20;
END $$;
GRANT EXECUTE ON FUNCTION public.rare_sightings_near(double precision, double precision, double precision) TO authenticated;