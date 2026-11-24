CREATE OR REPLACE FUNCTION public.league_board()
RETURNS TABLE(rank integer, user_id uuid, display_name text, username text, avatar_url text, points integer, captures integer, is_me boolean, tier smallint, group_size integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group uuid;
  v_week date;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  v_group := public.league_join(auth.uid());
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
END;
$$;
REVOKE ALL ON FUNCTION public.league_board() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.league_board() TO authenticated;

CREATE OR REPLACE FUNCTION public.xp_leaderboard_v2(p_limit integer DEFAULT 20, p_scope text DEFAULT 'global', p_period text DEFAULT 'week')
RETURNS TABLE(rank bigint, user_id uuid, display_name text, username text, avatar_url text, xp bigint, captures bigint, is_me boolean, total_players bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT x.rank, x.user_id, x.display_name, x.username, x.avatar_url, x.xp,
         (SELECT count(*) FROM public.captures c
            WHERE c.user_id = x.user_id AND c.status = 'approved'
              AND (coalesce(p_period,'week') = 'all'
                   OR c.created_at >= (date_trunc('week', now() AT TIME ZONE 'Europe/Paris')) AT TIME ZONE 'Europe/Paris')),
         x.is_me, x.total_players
  FROM public.xp_leaderboard(p_limit, p_scope, p_period) x;
$$;
REVOKE ALL ON FUNCTION public.xp_leaderboard_v2(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.xp_leaderboard_v2(integer, text, text) TO authenticated;