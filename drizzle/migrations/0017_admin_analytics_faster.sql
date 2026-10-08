CREATE OR REPLACE FUNCTION public.admin_analytics(_start timestamptz, _end timestamptz, _excluded uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  WITH
  p AS (SELECT user_id, created_at, coalesce(display_name, username, '—') AS name FROM profiles WHERE NOT (user_id = ANY(_excluded))),
  c AS (SELECT user_id, created_at FROM captures WHERE NOT (user_id = ANY(_excluded))),
  l AS (SELECT user_id, created_at FROM login_events WHERE NOT (user_id = ANY(_excluded))),
  cp AS (SELECT * FROM c WHERE created_at BETWEEN _start AND _end),
  lp AS (SELECT * FROM l WHERE created_at BETWEEN _start AND _end),
  acts AS (SELECT user_id, created_at FROM c UNION ALL SELECT user_id, created_at FROM l),
  gaps AS (SELECT extract(epoch FROM created_at - lag(created_at) OVER (PARTITION BY user_id ORDER BY created_at)) g FROM c),
  last_act AS (SELECT user_id, max(created_at) m FROM acts GROUP BY user_id),
  ret AS (
    SELECT d,
      count(*) FILTER (WHERE p.created_at <= now() - make_interval(days => d)) n,
      count(*) FILTER (WHERE p.created_at <= now() - make_interval(days => d) AND la.m >= p.created_at + make_interval(days => d)) k
    FROM p LEFT JOIN last_act la USING (user_id) CROSS JOIN (VALUES (1),(7),(30)) v(d) GROUP BY d)
  SELECT jsonb_build_object(
    'dau', (SELECT count(DISTINCT user_id) FROM l WHERE created_at >= now() - interval '1 day'),
    'wau', (SELECT count(DISTINCT user_id) FROM l WHERE created_at >= now() - interval '7 days'),
    'mau', (SELECT count(DISTINCT user_id) FROM l WHERE created_at >= now() - interval '30 days'),
    'totalUsers', (SELECT count(*) FROM p),
    'totalCaptures', (SELECT count(*) FROM c),
    'usersWithCapture', (SELECT count(DISTINCT user_id) FROM c),
    'activeInPeriod', (SELECT count(DISTINCT user_id) FROM lp),
    'loginsInPeriod', (SELECT count(*) FROM lp),
    'newUsersInPeriod', (SELECT count(*) FROM p WHERE created_at BETWEEN _start AND _end),
    'capturesInPeriod', (SELECT count(*) FROM cp),
    'capturersInPeriod', (SELECT count(DISTINCT user_id) FROM cp),
    'avgGapHours', coalesce((SELECT avg(g) / 3600 FROM gaps WHERE g IS NOT NULL), 0),
    'newInPeriodActive', (SELECT count(*) FROM (SELECT DISTINCT user_id FROM lp) x JOIN p USING (user_id) WHERE p.created_at >= _start),
    'newUsersByWeek', coalesce((SELECT jsonb_agg(jsonb_build_object('week', w, 'count', n) ORDER BY w) FROM (SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') w, count(*) n FROM p WHERE created_at BETWEEN _start AND _end GROUP BY 1) s), '[]'),
    'loginsByWeek', coalesce((SELECT jsonb_agg(jsonb_build_object('week', w, 'count', n) ORDER BY w) FROM (SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') w, count(*) n FROM lp GROUP BY 1) s), '[]'),
    'capturesByDay', coalesce((SELECT jsonb_agg(jsonb_build_object('date', d, 'count', n) ORDER BY d) FROM (SELECT to_char(created_at, 'YYYY-MM-DD') d, count(*) n FROM cp GROUP BY 1) s), '[]'),
    'topUsers', coalesce((SELECT jsonb_agg(jsonb_build_object('user_id', t.user_id, 'name', coalesce(p.name, '—'), 'captures', t.n) ORDER BY t.n DESC) FROM (SELECT user_id, count(*) n FROM cp GROUP BY 1 ORDER BY 2 DESC LIMIT 10) t LEFT JOIN p USING (user_id)), '[]'),
    'retention', (SELECT jsonb_object_agg('j' || d, jsonb_build_object('n', n, 'k', k)) FROM ret),
    'cancelReasons', coalesce((SELECT jsonb_agg(jsonb_build_object('reason', reason, 'count', n) ORDER BY n DESC) FROM (SELECT reason, count(*) n FROM cancellation_feedback WHERE created_at BETWEEN _start AND _end GROUP BY 1) s), '[]'),
    'cancelComments', coalesce((SELECT jsonb_agg(jsonb_build_object('reason', reason, 'comment', comment, 'created_at', created_at) ORDER BY created_at DESC) FROM (SELECT * FROM cancellation_feedback WHERE comment IS NOT NULL AND created_at BETWEEN _start AND _end ORDER BY created_at DESC LIMIT 20) s), '[]')
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_analytics(timestamptz, timestamptz, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics(timestamptz, timestamptz, uuid[]) TO service_role;