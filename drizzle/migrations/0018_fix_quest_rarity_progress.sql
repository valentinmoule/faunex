CREATE OR REPLACE FUNCTION public.update_quest_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q RECORD;
  v_new_progress integer;
  v_week_start date := date_trunc('week', CURRENT_DATE)::date;
BEGIN
  FOR q IN
    SELECT d.id, d.progress, t.quest_type, t.target
    FROM public.daily_quests d
    JOIN public.quest_templates t ON t.id = d.template_id
    WHERE d.user_id = NEW.user_id AND d.quest_date = v_week_start AND d.completed = false
  LOOP
    v_new_progress := q.progress;
    CASE q.quest_type
      WHEN 'capture_count' THEN
        IF TG_OP = 'INSERT' THEN v_new_progress := q.progress + 1; END IF;
      WHEN 'capture_different' THEN
        SELECT COUNT(DISTINCT animal_name) INTO v_new_progress FROM public.captures
        WHERE user_id = NEW.user_id AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days' AND status = 'approved';
      WHEN 'capture_rarity' THEN
        SELECT COUNT(DISTINCT lower(animal_name)) INTO v_new_progress FROM public.captures
        WHERE user_id = NEW.user_id AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days' AND status = 'approved'
          AND rarity NOT IN ('common','uncommon');
        v_new_progress := GREATEST(v_new_progress, q.progress);
      WHEN 'new_zone' THEN
        SELECT COUNT(DISTINCT location) INTO v_new_progress FROM public.captures
        WHERE user_id = NEW.user_id AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days'
          AND location IS NOT NULL AND location <> '' AND status = 'approved';
      ELSE NULL;
    END CASE;
    IF v_new_progress > q.target THEN v_new_progress := q.target; END IF;
    IF v_new_progress <> q.progress THEN
      UPDATE public.daily_quests SET progress = v_new_progress,
        completed = (v_new_progress >= q.target) WHERE id = q.id;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_update_quest_progress ON public.captures;
CREATE TRIGGER trg_update_quest_progress AFTER INSERT OR UPDATE OF status, rarity ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.update_quest_progress();

-- Backfill this week's rarity quests
WITH wk AS (SELECT date_trunc('week', CURRENT_DATE)::date AS s),
cnt AS (
  SELECT d.id, LEAST(t.target, (SELECT COUNT(DISTINCT lower(c.animal_name)) FROM public.captures c, wk
     WHERE c.user_id = d.user_id AND c.created_at >= wk.s AND c.created_at < wk.s + INTERVAL '7 days'
       AND c.status='approved' AND c.rarity NOT IN ('common','uncommon'))::int) AS n, t.target
  FROM public.daily_quests d JOIN public.quest_templates t ON t.id = d.template_id, wk
  WHERE t.quest_type='capture_rarity' AND d.quest_date = wk.s AND d.completed = false
)
UPDATE public.daily_quests d SET progress = cnt.n, completed = cnt.n >= cnt.target
FROM cnt WHERE d.id = cnt.id AND cnt.n > d.progress;

-- Fix wrong description on Marmotte captures
UPDATE public.captures c SET description = sp.description, habitat = sp.habitat, diet = sp.diet,
  conservation = sp.conservation, fun_fact = sp.fun_fact
FROM public.species_profiles sp
WHERE sp.normalized_name = 'marmotte' AND c.animal_name ilike 'marmotte%' AND c.description ilike '%panthère%';