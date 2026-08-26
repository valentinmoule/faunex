CREATE TABLE IF NOT EXISTS public.identify_cache (
  image_hash text PRIMARY KEY,
  payload jsonb NOT NULL,
  outcome text NOT NULL DEFAULT 'success',
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_hit_at timestamptz
);

GRANT ALL ON public.identify_cache TO service_role;
ALTER TABLE public.identify_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS identify_cache_created_at_idx ON public.identify_cache (created_at);

CREATE OR REPLACE FUNCTION public.claim_identify_cache(p_hash text, p_max_age interval)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  UPDATE public.identify_cache
     SET hits = hits + 1, last_hit_at = now()
   WHERE image_hash = p_hash
     AND created_at > now() - p_max_age
  RETURNING payload INTO v;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_identify_cache(text, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_identify_cache(text, interval) TO service_role;

CREATE OR REPLACE FUNCTION public.ai_usage_stats(p_days integer DEFAULT 14)
RETURNS TABLE (
  day date,
  identify_calls bigint,
  cache_hits bigint,
  captures bigint,
  auto_moderations bigint,
  calls_per_capture numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series((now() - make_interval(days => p_days))::date, now()::date, '1 day')::date AS day
  ),
  ev AS (
    SELECT created_at::date AS day, event_type, source
      FROM public.ml_dataset_events
     WHERE created_at > now() - make_interval(days => p_days + 1)
  ),
  cap AS (
    SELECT created_at::date AS day FROM public.captures
     WHERE created_at > now() - make_interval(days => p_days + 1)
  )
  SELECT d.day,
         (SELECT count(*) FROM ev WHERE ev.day = d.day AND ev.event_type = 'ai_prediction' AND ev.source = 'server'),
         (SELECT count(*) FROM ev WHERE ev.day = d.day AND ev.event_type = 'identify_cache_hit'),
         (SELECT count(*) FROM cap WHERE cap.day = d.day),
         (SELECT count(*) FROM ev WHERE ev.day = d.day AND ev.event_type IN ('auto_moderation_approved', 'auto_moderation_deferred')),
         ROUND(
           (SELECT count(*) FROM ev WHERE ev.day = d.day AND ev.event_type = 'ai_prediction' AND ev.source = 'server')::numeric
           / GREATEST((SELECT count(*) FROM cap WHERE cap.day = d.day), 1), 2)
    FROM days d
   ORDER BY d.day DESC;
$$;

REVOKE ALL ON FUNCTION public.ai_usage_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_usage_stats(integer) TO service_role;