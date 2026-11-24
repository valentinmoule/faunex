CREATE OR REPLACE FUNCTION public.league_current_group(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_week date := (date_trunc('week', CURRENT_DATE))::date;
  r record;
  v_group uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  FOR r IN
    SELECT DISTINCT m.group_id FROM public.league_members m
    JOIN public.league_groups lg ON lg.id = m.group_id
    WHERE m.user_id = p_user_id AND lg.week_start < v_week AND lg.settled_at IS NULL
  LOOP
    PERFORM public.settle_league_group(r.group_id);
  END LOOP;
  SELECT group_id INTO v_group FROM public.league_members
  WHERE user_id = p_user_id AND week_start = v_week AND points > 0;
  RETURN v_group;
END; $$;
REVOKE ALL ON FUNCTION public.league_current_group(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.league_board()
RETURNS TABLE(rank integer, user_id uuid, display_name text, username text, avatar_url text, points integer, captures integer, is_me boolean, tier smallint, group_size integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group uuid;
  v_week date;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  v_group := public.league_current_group(auth.uid());
  IF v_group IS NULL THEN RETURN; END IF;
  SELECT g.week_start INTO v_week FROM public.league_groups g WHERE g.id = v_group;
  RETURN QUERY
  SELECT (row_number() OVER (ORDER BY m.points DESC, m.created_at ASC))::int,
         m.user_id, p.display_name, p.username, p.avatar_url, m.points,
         (SELECT count(*) FROM public.captures c
            WHERE c.user_id = m.user_id AND c.status = 'approved'
              AND c.created_at >= v_week::timestamp AT TIME ZONE 'Europe/Paris')::int,
         m.user_id = auth.uid(),
         g.tier,
         (count(*) OVER ())::int
  FROM public.league_members m
  JOIN public.league_groups g ON g.id = m.group_id
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.group_id = v_group
  ORDER BY m.points DESC, m.created_at ASC;
END; $$;

CREATE OR REPLACE FUNCTION public.my_league()
RETURNS TABLE(week_start date, tier smallint, rank integer, points integer, group_size integer, prev_outcome text, prev_tier smallint, prev_rank integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_week date := (date_trunc('week', CURRENT_DATE))::date;
  v_group uuid;
BEGIN
  v_group := public.league_current_group(auth.uid());
  IF v_group IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH ranked AS (
    SELECT m.user_id, m.points,
           row_number() OVER (ORDER BY m.points DESC, m.created_at ASC)::int AS rnk,
           count(*) OVER ()::int AS grp_size
    FROM public.league_members m WHERE m.group_id = v_group
  ), prev AS (
    SELECT lr.outcome AS prev_outcome, lr.tier AS prev_tier, lr.rank AS prev_rank
    FROM public.league_results lr WHERE lr.user_id = auth.uid()
    ORDER BY lr.week_start DESC LIMIT 1
  )
  SELECT v_week, g.tier, r.rnk, r.points, r.grp_size, p.prev_outcome, p.prev_tier, p.prev_rank
  FROM ranked r
  JOIN public.league_groups g ON g.id = v_group
  LEFT JOIN prev p ON true
  WHERE r.user_id = auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.my_league_upcoming_tier()
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier smallint;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  PERFORM public.league_current_group(auth.uid());
  SELECT COALESCE((SELECT lr.next_tier FROM public.league_results lr
    WHERE lr.user_id = auth.uid() ORDER BY lr.week_start DESC LIMIT 1), 0) INTO v_tier;
  RETURN GREATEST(0, LEAST(6, v_tier));
END; $$;
REVOKE ALL ON FUNCTION public.my_league_upcoming_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_league_upcoming_tier() TO authenticated;