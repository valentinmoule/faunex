-- Switch quests from daily to weekly cycle
-- quest_date now stores the Monday of the week (date_trunc('week', date))

-- Default for new rows: start of current week (Monday)
ALTER TABLE public.daily_quests
  ALTER COLUMN quest_date SET DEFAULT (date_trunc('week', CURRENT_DATE)::date);

-- Update progress function: compute progress over the current week instead of the day
CREATE OR REPLACE FUNCTION public.update_quest_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  q RECORD;
  v_new_progress integer;
  v_distinct_week integer;
  v_distinct_locations integer;
  v_week_start date := date_trunc('week', CURRENT_DATE)::date;
BEGIN
  -- Loop through this week's uncompleted quests for this user
  FOR q IN
    SELECT * FROM public.daily_quests
    WHERE user_id = NEW.user_id
      AND quest_date = v_week_start
      AND completed = false
  LOOP
    v_new_progress := q.progress;

    CASE q.quest_type
      WHEN 'capture_count' THEN
        v_new_progress := q.progress + 1;

      WHEN 'capture_different' THEN
        SELECT COUNT(DISTINCT animal_name) INTO v_distinct_week
        FROM public.captures
        WHERE user_id = NEW.user_id
          AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days'
          AND status = 'approved';
        v_new_progress := v_distinct_week;

      WHEN 'capture_rarity' THEN
        IF NEW.rarity IN ('rare', 'epic', 'mythic') THEN
          v_new_progress := q.progress + 1;
        END IF;

      WHEN 'new_zone' THEN
        SELECT COUNT(DISTINCT location) INTO v_distinct_locations
        FROM public.captures
        WHERE user_id = NEW.user_id
          AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days'
          AND location IS NOT NULL
          AND location != ''
          AND status = 'approved';
        v_new_progress := v_distinct_locations;

      ELSE
        NULL;
    END CASE;

    IF v_new_progress > q.target THEN
      v_new_progress := q.target;
    END IF;

    IF v_new_progress != q.progress THEN
      UPDATE public.daily_quests
      SET progress = v_new_progress,
          completed = (v_new_progress >= q.target)
      WHERE id = q.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;