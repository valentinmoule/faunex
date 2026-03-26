
-- Daily quests assigned to users
CREATE TABLE public.daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_type text NOT NULL,          -- capture_count, capture_different, capture_rarity, new_zone
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🎯',
  target integer NOT NULL DEFAULT 1, -- goal count
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  xp_reward integer NOT NULL DEFAULT 50,
  quest_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_daily_quests_user_date ON public.daily_quests (user_id, quest_date);

-- RLS
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests"
  ON public.daily_quests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quests"
  ON public.daily_quests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts (from edge function / trigger)
CREATE POLICY "Service can insert quests"
  ON public.daily_quests FOR INSERT
  TO public
  WITH CHECK (true);

-- Enable realtime for quest progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_quests;

-- Trigger: update quest progress on new capture
CREATE OR REPLACE FUNCTION public.update_quest_progress()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  q RECORD;
  v_new_progress integer;
  v_distinct_today integer;
  v_distinct_locations integer;
BEGIN
  -- Loop through today's uncompleted quests for this user
  FOR q IN
    SELECT * FROM public.daily_quests
    WHERE user_id = NEW.user_id
      AND quest_date = CURRENT_DATE
      AND completed = false
  LOOP
    v_new_progress := q.progress;

    CASE q.quest_type
      WHEN 'capture_count' THEN
        -- Any capture counts
        v_new_progress := q.progress + 1;

      WHEN 'capture_different' THEN
        -- Count distinct species captured today
        SELECT COUNT(DISTINCT animal_name) INTO v_distinct_today
        FROM public.captures
        WHERE user_id = NEW.user_id
          AND DATE(created_at) = CURRENT_DATE
          AND status = 'approved';
        v_new_progress := v_distinct_today;

      WHEN 'capture_rarity' THEN
        -- Check if this capture matches a rare+ rarity
        IF NEW.rarity IN ('rare', 'epic', 'mythic') THEN
          v_new_progress := q.progress + 1;
        END IF;

      WHEN 'new_zone' THEN
        -- Count distinct locations today
        SELECT COUNT(DISTINCT location) INTO v_distinct_locations
        FROM public.captures
        WHERE user_id = NEW.user_id
          AND DATE(created_at) = CURRENT_DATE
          AND location IS NOT NULL
          AND location != ''
          AND status = 'approved';
        v_new_progress := v_distinct_locations;

      ELSE
        NULL;
    END CASE;

    -- Cap progress at target
    IF v_new_progress > q.target THEN
      v_new_progress := q.target;
    END IF;

    -- Update if changed
    IF v_new_progress != q.progress THEN
      UPDATE public.daily_quests
      SET progress = v_new_progress,
          completed = (v_new_progress >= q.target)
      WHERE id = q.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_quest_progress
  AFTER INSERT ON public.captures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quest_progress();

-- Function to claim quest reward
CREATE OR REPLACE FUNCTION public.claim_quest_reward(p_quest_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_quest RECORD;
BEGIN
  SELECT * INTO v_quest
  FROM public.daily_quests
  WHERE id = p_quest_id
    AND user_id = auth.uid()
    AND completed = true
    AND claimed = false;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Mark as claimed
  UPDATE public.daily_quests SET claimed = true WHERE id = p_quest_id;

  -- Grant XP reward
  PERFORM public.grant_xp(auth.uid(), v_quest.xp_reward);

  RETURN true;
END;
$$;
