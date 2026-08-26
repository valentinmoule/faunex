-- 1. Tiers reference
CREATE TABLE public.league_tiers (
  tier smallint PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text NOT NULL
);
GRANT SELECT ON public.league_tiers TO authenticated;
GRANT ALL ON public.league_tiers TO service_role;
ALTER TABLE public.league_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers readable by authenticated" ON public.league_tiers FOR SELECT TO authenticated USING (true);

INSERT INTO public.league_tiers (tier, slug, label, emoji) VALUES
  (0, 'debutant', 'Débutant', '🌱'),
  (1, 'bronze', 'Bronze', '🥉'),
  (2, 'argent', 'Argent', '🥈'),
  (3, 'or', 'Or', '🥇'),
  (4, 'platine', 'Platine', '💎'),
  (5, 'diamant', 'Diamant', '💠'),
  (6, 'elite', 'Élite', '👑');

-- 2. Groups
CREATE TABLE public.league_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start date NOT NULL,
  tier smallint NOT NULL REFERENCES public.league_tiers(tier),
  group_no integer NOT NULL,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, tier, group_no)
);
GRANT SELECT ON public.league_groups TO authenticated;
GRANT ALL ON public.league_groups TO service_role;
ALTER TABLE public.league_groups ENABLE ROW LEVEL SECURITY;

-- 3. Members
CREATE TABLE public.league_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.league_groups(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
CREATE INDEX league_members_group_idx ON public.league_members (group_id, points DESC);
GRANT SELECT ON public.league_members TO authenticated;
GRANT ALL ON public.league_members TO service_role;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own membership" ON public.league_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Groups readable by their members" ON public.league_groups
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.league_members m WHERE m.group_id = public.league_groups.id AND m.user_id = auth.uid())
  );

CREATE TRIGGER league_members_updated_at
  BEFORE UPDATE ON public.league_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Results history
CREATE TABLE public.league_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  tier smallint NOT NULL,
  next_tier smallint NOT NULL,
  rank integer NOT NULL,
  points integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('promoted', 'stayed', 'demoted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
CREATE INDEX league_results_user_idx ON public.league_results (user_id, week_start DESC);
GRANT SELECT ON public.league_results TO authenticated;
GRANT ALL ON public.league_results TO service_role;
ALTER TABLE public.league_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Results read own" ON public.league_results
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 5. Settlement of a finished group
CREATE OR REPLACE FUNCTION public.settle_league_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.league_groups;
  v_size integer;
BEGIN
  SELECT * INTO g FROM public.league_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND OR g.settled_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_size FROM public.league_members WHERE group_id = p_group_id;

  INSERT INTO public.league_results (user_id, week_start, tier, next_tier, rank, points, outcome)
  SELECT s.user_id,
         g.week_start,
         g.tier,
         CASE
           WHEN s.rnk <= 5 AND s.points > 0 AND g.tier < 6 THEN g.tier + 1
           WHEN s.rnk > v_size - 5 AND v_size >= 10 AND g.tier > 0 THEN g.tier - 1
           ELSE g.tier
         END,
         s.rnk,
         s.points,
         CASE
           WHEN s.rnk <= 5 AND s.points > 0 AND g.tier < 6 THEN 'promoted'
           WHEN s.rnk > v_size - 5 AND v_size >= 10 AND g.tier > 0 THEN 'demoted'
           ELSE 'stayed'
         END
  FROM (
    SELECT m.user_id, m.points,
           row_number() OVER (ORDER BY m.points DESC, m.created_at ASC) AS rnk
    FROM public.league_members m
    WHERE m.group_id = p_group_id
  ) s
  ON CONFLICT (user_id, week_start) DO NOTHING;

  UPDATE public.league_groups SET settled_at = now() WHERE id = p_group_id;
END;
$$;

-- 6. Weekly join (idempotent)
CREATE OR REPLACE FUNCTION public.league_join(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week date := (date_trunc('week', CURRENT_DATE))::date;
  v_group uuid;
  v_tier smallint;
  v_next integer;
  r record;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Settle any past unsettled group this user played in
  FOR r IN
    SELECT DISTINCT m.group_id
    FROM public.league_members m
    JOIN public.league_groups lg ON lg.id = m.group_id
    WHERE m.user_id = p_user_id AND lg.week_start < v_week AND lg.settled_at IS NULL
  LOOP
    PERFORM public.settle_league_group(r.group_id);
  END LOOP;

  SELECT group_id INTO v_group
  FROM public.league_members
  WHERE user_id = p_user_id AND week_start = v_week;
  IF v_group IS NOT NULL THEN
    RETURN v_group;
  END IF;

  SELECT COALESCE((
    SELECT lr.next_tier FROM public.league_results lr
    WHERE lr.user_id = p_user_id
    ORDER BY lr.week_start DESC LIMIT 1
  ), 0) INTO v_tier;
  v_tier := GREATEST(0, LEAST(6, v_tier));

  SELECT lg.id INTO v_group
  FROM public.league_groups lg
  WHERE lg.week_start = v_week
    AND lg.tier = v_tier
    AND (SELECT count(*) FROM public.league_members m WHERE m.group_id = lg.id) < 20
  ORDER BY lg.group_no
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_group IS NULL THEN
    SELECT COALESCE(max(group_no), 0) + 1 INTO v_next
    FROM public.league_groups
    WHERE week_start = v_week AND tier = v_tier;

    INSERT INTO public.league_groups (week_start, tier, group_no)
    VALUES (v_week, v_tier, v_next)
    ON CONFLICT (week_start, tier, group_no) DO NOTHING
    RETURNING id INTO v_group;

    IF v_group IS NULL THEN
      SELECT id INTO v_group FROM public.league_groups
      WHERE week_start = v_week AND tier = v_tier AND group_no = v_next;
    END IF;
  END IF;

  INSERT INTO public.league_members (user_id, group_id, week_start)
  VALUES (p_user_id, v_group, v_week)
  ON CONFLICT (user_id, week_start) DO NOTHING;

  SELECT group_id INTO v_group FROM public.league_members
  WHERE user_id = p_user_id AND week_start = v_week;

  RETURN v_group;
END;
$$;

-- 7. Points accrual
CREATE OR REPLACE FUNCTION public.league_add_points(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week date := (date_trunc('week', CURRENT_DATE))::date;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_amount, 0) <= 0 THEN
    RETURN;
  END IF;

  PERFORM public.league_join(p_user_id);

  UPDATE public.league_members
  SET points = points + p_amount
  WHERE user_id = p_user_id AND week_start = v_week;
END;
$$;

-- 8. Hook league points into XP grants (level maths unchanged)
CREATE OR REPLACE FUNCTION public.grant_xp(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp integer;
  v_level integer;
  v_xp_to_next integer;
BEGIN
  SELECT xp, level, xp_to_next INTO v_xp, v_level, v_xp_to_next
  FROM public.profiles WHERE user_id = p_user_id;

  v_xp := v_xp + p_amount;

  WHILE v_xp >= v_xp_to_next LOOP
    v_xp := v_xp - v_xp_to_next;
    v_level := v_level + 1;
    CASE
      WHEN v_level <= 1 THEN v_xp_to_next := 50;
      WHEN v_level = 2 THEN v_xp_to_next := 120;
      WHEN v_level = 3 THEN v_xp_to_next := 200;
      WHEN v_level = 4 THEN v_xp_to_next := 300;
      WHEN v_level = 5 THEN v_xp_to_next := 400;
      ELSE v_xp_to_next := 400 + (v_level - 5) * 100;
    END CASE;
  END LOOP;

  UPDATE public.profiles
  SET xp = v_xp, level = v_level, xp_to_next = v_xp_to_next, updated_at = now()
  WHERE user_id = p_user_id;

  BEGIN
    PERFORM public.league_add_points(p_user_id, p_amount);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'league_add_points failed for %: %', p_user_id, SQLERRM;
  END;
END;
$$;

-- 9. Read APIs
CREATE OR REPLACE FUNCTION public.my_league()
RETURNS TABLE(week_start date, tier smallint, rank integer, points integer, group_size integer, prev_outcome text, prev_tier smallint, prev_rank integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week date := (date_trunc('week', CURRENT_DATE))::date;
  v_group uuid;
BEGIN
  v_group := public.league_join(auth.uid());
  IF v_group IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT m.user_id, m.points,
           row_number() OVER (ORDER BY m.points DESC, m.created_at ASC)::int AS rnk,
           count(*) OVER ()::int AS size
    FROM public.league_members m
    WHERE m.group_id = v_group
  ), prev AS (
    SELECT lr.outcome, lr.tier, lr.rank
    FROM public.league_results lr
    WHERE lr.user_id = auth.uid()
    ORDER BY lr.week_start DESC
    LIMIT 1
  )
  SELECT v_week,
         g.tier,
         r.rnk,
         r.points,
         r.size,
         (SELECT outcome FROM prev),
         (SELECT tier FROM prev),
         (SELECT rank FROM prev)
  FROM ranked r
  JOIN public.league_groups g ON g.id = v_group
  WHERE r.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.league_standings()
RETURNS TABLE(rank integer, user_id uuid, display_name text, username text, avatar_url text, points integer, is_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT group_id FROM public.league_members
    WHERE user_id = auth.uid()
      AND week_start = (date_trunc('week', CURRENT_DATE))::date
  )
  SELECT row_number() OVER (ORDER BY m.points DESC, m.created_at ASC)::int,
         m.user_id, p.display_name, p.username, p.avatar_url, m.points,
         m.user_id = auth.uid()
  FROM public.league_members m
  JOIN me ON me.group_id = m.group_id
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  ORDER BY m.points DESC, m.created_at ASC;
$$;