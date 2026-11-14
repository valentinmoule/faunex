CREATE OR REPLACE FUNCTION public.admin_learning_stats(_start timestamptz, _end timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb;
  _excluded uuid[] := ARRAY[
    'c62717cb-255a-4491-a5a0-132880e703be',
    'ac0df155-7422-4073-bfc1-14e2a71960bc',
    'f7910e92-39a6-4703-b31d-bf1e245e2a4e'
  ]::uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH
  a AS (SELECT user_id, path_id, finished, created_at FROM learning_attempts WHERE NOT (user_id = ANY(_excluded))),
  ap AS (SELECT * FROM a WHERE created_at BETWEEN _start AND _end),
  cp AS (SELECT * FROM learning_completions WHERE NOT (user_id = ANY(_excluded)) AND completed_at BETWEEN _start AND _end),
  lp AS (SELECT DISTINCT user_id FROM login_events WHERE NOT (user_id = ANY(_excluded)) AND created_at BETWEEN _start AND _end),
  learners AS (SELECT DISTINCT user_id FROM ap),
  days_per_user AS (SELECT user_id, count(DISTINCT (created_at AT TIME ZONE 'Europe/Paris')::date) d FROM ap GROUP BY 1)
  SELECT jsonb_build_object(
    'activeInPeriod', (SELECT count(*) FROM lp),
    'learners', (SELECT count(*) FROM learners),
    'activeLearners', (SELECT count(*) FROM learners JOIN lp USING (user_id)),
    'returningLearners', (SELECT count(*) FROM days_per_user WHERE d >= 2),
    'started', (SELECT count(*) FROM ap),
    'finished', (SELECT count(*) FROM ap WHERE finished),
    'lessonsPassed', (SELECT count(*) FROM cp),
    'totalUsers', (SELECT count(*) FROM profiles WHERE NOT (user_id = ANY(_excluded))),
    'learnersAllTime', (SELECT count(DISTINCT user_id) FROM a),
    'learnersByWeek', coalesce((SELECT jsonb_agg(jsonb_build_object('week', w, 'count', n) ORDER BY w)
      FROM (SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') w, count(DISTINCT user_id) n FROM ap GROUP BY 1) s), '[]'),
    'byPath', coalesce((SELECT jsonb_agg(jsonb_build_object('title', coalesce(lpath.title, '—'), 'learners', s.u, 'started', s.st, 'finished', s.fi) ORDER BY s.u DESC)
      FROM (SELECT path_id, count(DISTINCT user_id) u, count(*) st, count(*) FILTER (WHERE finished) fi FROM ap GROUP BY 1) s
      LEFT JOIN learning_paths lpath ON lpath.id = s.path_id), '[]')
  ) INTO r;
  RETURN r;
END $function$;

REVOKE EXECUTE ON FUNCTION public.admin_learning_stats(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_learning_stats(timestamptz, timestamptz) TO authenticated, service_role;