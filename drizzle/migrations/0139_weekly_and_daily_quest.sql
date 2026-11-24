ALTER TABLE public.quest_templates ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'week' CHECK (period IN ('week','day'));

CREATE OR REPLACE VIEW public.weekly_quests AS
 SELECT q.id, q.user_id, q.template_id, t.quest_type, t.title, t.description, t.icon, t.target, t.xp_reward,
        q.progress, q.completed, q.claimed, q.quest_date, q.created_at, t.period
   FROM public.daily_quests q JOIN public.quest_templates t ON t.id = q.template_id;

CREATE OR REPLACE FUNCTION public.draw_weekly_quests(p_week date DEFAULT (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.weekly_quest_draw WHERE week_start = p_week) THEN RETURN 0; END IF;
  INSERT INTO public.weekly_quest_draw (week_start, slot, template_id)
  SELECT p_week, 1, t.id FROM public.quest_templates t
  WHERE t.active AND t.period = 'week'
  ORDER BY md5(t.id::text || p_week::text) LIMIT 1
  ON CONFLICT DO NOTHING;
  RETURN 1;
END; $function$;

CREATE OR REPLACE FUNCTION public.ensure_weekly_quests_for(p_user_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_week date := date_trunc('week', CURRENT_DATE)::date; v_today date := CURRENT_DATE; v_n integer := 0; v_c integer;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;
  PERFORM public.draw_weekly_quests(v_week);
  DELETE FROM public.daily_quests q USING public.quest_templates t
  WHERE q.template_id = t.id AND q.user_id = p_user_id
    AND ((t.period = 'week' AND q.quest_date <> v_week) OR (t.period = 'day' AND q.quest_date <> v_today));
  INSERT INTO public.daily_quests (user_id, template_id, quest_date, progress, completed, claimed)
  SELECT p_user_id, d.template_id, v_week, 0, false, false FROM public.weekly_quest_draw d
  WHERE d.week_start = v_week ON CONFLICT (user_id, quest_date, template_id) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
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
     AND ((t.period='week' AND d.quest_date=date_trunc('week',CURRENT_DATE)::date) OR (t.period='day' AND d.quest_date=CURRENT_DATE)) LOOP
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