CREATE OR REPLACE FUNCTION public.draw_weekly_quests(p_week date DEFAULT (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_inserted integer := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.weekly_quest_draw WHERE week_start = p_week) THEN RETURN 0; END IF;
  WITH pool AS (
    SELECT t.id, md5(t.id::text || p_week::text) AS ord,
           row_number() OVER (PARTITION BY t.quest_type ORDER BY md5(t.id::text || p_week::text)) AS rn
    FROM public.quest_templates t WHERE t.active
  ), picked AS (
    SELECT id, row_number() OVER (ORDER BY ord) AS slot
    FROM (SELECT id, ord FROM pool WHERE rn = 1 ORDER BY ord LIMIT 2) s
  )
  INSERT INTO public.weekly_quest_draw (week_start, slot, template_id)
  SELECT p_week, picked.slot, picked.id FROM picked ON CONFLICT DO NOTHING;
  SELECT count(*) INTO v_inserted FROM public.weekly_quest_draw WHERE week_start = p_week;
  RETURN v_inserted;
END; $function$;