-- 1. Quest catalogue
CREATE TABLE public.quest_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  quest_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  target integer NOT NULL CHECK (target > 0),
  xp_reward integer NOT NULL CHECK (xp_reward >= 0),
  difficulty integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quest_templates TO authenticated;
GRANT ALL ON public.quest_templates TO service_role;
ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quest templates readable by authenticated"
  ON public.quest_templates FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_quest_templates_updated_at
  BEFORE UPDATE ON public.quest_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.quest_templates (code, quest_type, title, description, icon, target, xp_reward, difficulty) VALUES
  ('capture_3',        'capture_count',     'Démarrage de la semaine', 'Fais 3 captures cette semaine',                         '🌅', 3,  80,  1),
  ('capture_7',        'capture_count',     'Chasseur de la semaine',  'Capture 7 espèces cette semaine',                       '📸', 7,  200, 2),
  ('capture_10',       'capture_count',     'Frénésie de captures',    'Capture 10 espèces cette semaine',                      '🔥', 10, 300, 3),
  ('capture_12',       'capture_count',     'Marathon hebdo',          'Capture 12 espèces cette semaine',                      '🏃', 12, 350, 3),
  ('different_4',      'capture_different', 'Diversité',               'Capture 4 espèces différentes cette semaine',           '🦎', 4,  200, 1),
  ('different_6',      'capture_different', 'Naturaliste curieux',     'Capture 6 espèces différentes cette semaine',           '🔬', 6,  300, 2),
  ('different_8',      'capture_different', 'Collectionneur',          'Capture 8 espèces différentes cette semaine',           '🗃️', 8,  400, 3),
  ('rarity_2',         'capture_rarity',    'Trouvaille rare',         'Capture 2 espèces rares ou mieux cette semaine',        '💎', 2,  250, 1),
  ('rarity_3',         'capture_rarity',    'Chercheur de trésors',    'Trouve 3 animaux rares cette semaine',                  '🏅', 3,  350, 2),
  ('rarity_4',         'capture_rarity',    'Chasseur d''élite',       'Capture 4 espèces rares ou mieux cette semaine',        '⚡', 4,  450, 3),
  ('zone_2',           'new_zone',          'Aventurier',              'Capture dans 2 nouveaux lieux cette semaine',           '🧭', 2,  180, 1),
  ('zone_3',           'new_zone',          'Explorateur',             'Explore 3 zones différentes cette semaine',             '🗺️', 3,  250, 2),
  ('zone_5',           'new_zone',          'Globe-trotter',           'Explore 5 zones différentes cette semaine',             '🌍', 5,  400, 3),
  ('share_1',          'share_app',         'Ambassadeur',             'Partage Faunex avec un ami',                            '🔗', 1,  50,  1),
  ('share_word',       'share_app',         'Bouche-à-oreille',        'Fais découvrir Faunex autour de toi',                   '🗣️', 1,  50,  1);

-- 2. Shared weekly draw (3 rows per week, identical for every user)
CREATE TABLE public.weekly_quest_draw (
  week_start date NOT NULL,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 5),
  template_id uuid NOT NULL REFERENCES public.quest_templates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start, slot),
  UNIQUE (week_start, template_id)
);

GRANT SELECT ON public.weekly_quest_draw TO authenticated;
GRANT ALL ON public.weekly_quest_draw TO service_role;
ALTER TABLE public.weekly_quest_draw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Weekly draw readable by authenticated"
  ON public.weekly_quest_draw FOR SELECT TO authenticated USING (true);

-- 3. Slim down the progress table
DROP POLICY IF EXISTS "Users can update own quests" ON public.daily_quests;

ALTER TABLE public.daily_quests ADD COLUMN template_id uuid;

UPDATE public.daily_quests q
SET template_id = t.id
FROM public.quest_templates t
WHERE t.title = q.title AND t.quest_type = q.quest_type AND t.target = q.target;

DELETE FROM public.daily_quests
WHERE template_id IS NULL
   OR quest_date <> (date_trunc('week', CURRENT_DATE))::date;

DELETE FROM public.daily_quests q
USING public.daily_quests d
WHERE q.user_id = d.user_id
  AND q.quest_date = d.quest_date
  AND q.template_id = d.template_id
  AND q.ctid > d.ctid;

ALTER TABLE public.daily_quests
  ALTER COLUMN template_id SET NOT NULL,
  ADD CONSTRAINT daily_quests_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES public.quest_templates(id) ON DELETE CASCADE,
  ADD CONSTRAINT daily_quests_user_week_template_key UNIQUE (user_id, quest_date, template_id),
  DROP COLUMN quest_type,
  DROP COLUMN title,
  DROP COLUMN description,
  DROP COLUMN icon,
  DROP COLUMN target,
  DROP COLUMN xp_reward;

-- 4. Client-facing view (joined quest details)
CREATE VIEW public.weekly_quests WITH (security_invoker = true) AS
SELECT
  q.id,
  q.user_id,
  q.template_id,
  t.quest_type,
  t.title,
  t.description,
  t.icon,
  t.target,
  t.xp_reward,
  q.progress,
  q.completed,
  q.claimed,
  q.quest_date,
  q.created_at
FROM public.daily_quests q
JOIN public.quest_templates t ON t.id = q.template_id;

GRANT SELECT ON public.weekly_quests TO authenticated;

-- 5. Weekly draw + per-user provisioning
CREATE OR REPLACE FUNCTION public.draw_weekly_quests(p_week date DEFAULT (date_trunc('week', CURRENT_DATE))::date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.weekly_quest_draw WHERE week_start = p_week) THEN
    RETURN 0;
  END IF;

  WITH pool AS (
    SELECT t.id,
           md5(t.id::text || p_week::text) AS ord,
           row_number() OVER (PARTITION BY t.quest_type ORDER BY md5(t.id::text || p_week::text)) AS rn
    FROM public.quest_templates t
    WHERE t.active
  ), picked AS (
    SELECT id, row_number() OVER (ORDER BY ord) AS slot
    FROM (SELECT id, ord FROM pool WHERE rn = 1 ORDER BY ord LIMIT 3) s
  )
  INSERT INTO public.weekly_quest_draw (week_start, slot, template_id)
  SELECT p_week, picked.slot, picked.id FROM picked
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_inserted FROM public.weekly_quest_draw WHERE week_start = p_week;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_weekly_quests_for(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week date := (date_trunc('week', CURRENT_DATE))::date;
  v_inserted integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM public.draw_weekly_quests(v_week);

  -- Only the current week is kept per user.
  DELETE FROM public.daily_quests
  WHERE user_id = p_user_id AND quest_date <> v_week;

  WITH ins AS (
    INSERT INTO public.daily_quests (user_id, template_id, quest_date, progress, completed, claimed)
    SELECT p_user_id, d.template_id, v_week, 0, false, false
    FROM public.weekly_quest_draw d
    WHERE d.week_start = v_week
    ON CONFLICT (user_id, quest_date, template_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN v_inserted;
END;
$$;

-- 6. Progress + rewards
CREATE OR REPLACE FUNCTION public.update_quest_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  q RECORD;
  v_new_progress integer;
  v_week_start date := date_trunc('week', CURRENT_DATE)::date;
BEGIN
  FOR q IN
    SELECT d.id, d.progress, t.quest_type, t.target
    FROM public.daily_quests d
    JOIN public.quest_templates t ON t.id = d.template_id
    WHERE d.user_id = NEW.user_id
      AND d.quest_date = v_week_start
      AND d.completed = false
  LOOP
    v_new_progress := q.progress;

    CASE q.quest_type
      WHEN 'capture_count' THEN
        v_new_progress := q.progress + 1;

      WHEN 'capture_different' THEN
        SELECT COUNT(DISTINCT animal_name) INTO v_new_progress
        FROM public.captures
        WHERE user_id = NEW.user_id
          AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days'
          AND status = 'approved';

      WHEN 'capture_rarity' THEN
        IF NEW.rarity IN ('rare', 'epic', 'mythic') THEN
          v_new_progress := q.progress + 1;
        END IF;

      WHEN 'new_zone' THEN
        SELECT COUNT(DISTINCT location) INTO v_new_progress
        FROM public.captures
        WHERE user_id = NEW.user_id
          AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days'
          AND location IS NOT NULL
          AND location <> ''
          AND status = 'approved';

      ELSE
        NULL;
    END CASE;

    IF v_new_progress > q.target THEN
      v_new_progress := q.target;
    END IF;

    IF v_new_progress <> q.progress THEN
      UPDATE public.daily_quests
      SET progress = v_new_progress,
          completed = (v_new_progress >= q.target)
      WHERE id = q.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_quest_reward(p_quest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer;
BEGIN
  SELECT t.xp_reward INTO v_xp
  FROM public.daily_quests d
  JOIN public.quest_templates t ON t.id = d.template_id
  WHERE d.id = p_quest_id
    AND d.user_id = auth.uid()
    AND d.completed = true
    AND d.claimed = false;

  IF v_xp IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.daily_quests SET claimed = true WHERE id = p_quest_id;
  PERFORM public.grant_xp(auth.uid(), v_xp);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_share_quest(p_quest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target integer;
BEGIN
  SELECT t.target INTO v_target
  FROM public.daily_quests d
  JOIN public.quest_templates t ON t.id = d.template_id
  WHERE d.id = p_quest_id
    AND d.user_id = auth.uid()
    AND d.completed = false
    AND t.quest_type = 'share_app';

  IF v_target IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.daily_quests
  SET progress = v_target, completed = true
  WHERE id = p_quest_id;

  RETURN true;
END;
$$;