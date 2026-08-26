CREATE OR REPLACE FUNCTION public.ai_usage_stats(p_days integer DEFAULT 14)
RETURNS TABLE (
  day date,
  identify_calls bigint,
  cache_hits bigint,
  captures bigint,
  auto_moderations bigint,
  calls_per_capture numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series((now() - make_interval(days => p_days))::date, now()::date, '1 day')::date AS d
  ),
  ev AS (
    SELECT created_at::date AS d, event_type, source
      FROM public.ml_dataset_events
     WHERE created_at > now() - make_interval(days => p_days + 1)
  ),
  cap AS (
    SELECT created_at::date AS d FROM public.captures
     WHERE created_at > now() - make_interval(days => p_days + 1)
  )
  SELECT days.d,
         (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type = 'ai_prediction' AND ev.source = 'server'),
         (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type = 'identify_cache_hit'),
         (SELECT count(*) FROM cap WHERE cap.d = days.d),
         (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type IN ('auto_moderation_approved', 'auto_moderation_deferred')),
         ROUND(
           (SELECT count(*) FROM ev WHERE ev.d = days.d AND ev.event_type = 'ai_prediction' AND ev.source = 'server')::numeric
           / GREATEST((SELECT count(*) FROM cap WHERE cap.d = days.d), 1), 2)
    FROM days
   ORDER BY days.d DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_usage_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_usage_stats(integer) TO authenticated, service_role;