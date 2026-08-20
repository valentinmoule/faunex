CREATE TABLE IF NOT EXISTS public.background_jobs (
  job_key text PRIMARY KEY,
  status text NOT NULL DEFAULT 'active',
  paused_reason text,
  lease_until timestamptz,
  last_run_at timestamptz,
  last_error text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.background_jobs TO authenticated;
GRANT ALL ON public.background_jobs TO service_role;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view background jobs" ON public.background_jobs;
CREATE POLICY "Admins can view background jobs"
  ON public.background_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_background_jobs_updated_at ON public.background_jobs;
CREATE TRIGGER update_background_jobs_updated_at
  BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.background_jobs (job_key) VALUES ('auto_moderate_captures')
ON CONFLICT (job_key) DO NOTHING;

-- Prend le verrou de la tâche. Renvoie 'run', 'probe' ou 'skip'.
CREATE OR REPLACE FUNCTION public.acquire_background_job(p_job_key text, p_lease_seconds integer DEFAULT 300)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  j public.background_jobs;
BEGIN
  INSERT INTO public.background_jobs (job_key) VALUES (p_job_key)
  ON CONFLICT (job_key) DO NOTHING;

  SELECT * INTO j FROM public.background_jobs
  WHERE job_key = p_job_key FOR UPDATE;

  -- Verrou déjà pris par une exécution en cours
  IF j.lease_until IS NOT NULL AND j.lease_until > now() THEN
    RETURN 'skip';
  END IF;

  UPDATE public.background_jobs
  SET lease_until = now() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 300), 30)),
      last_run_at = now()
  WHERE job_key = p_job_key;

  IF j.status = 'paused' THEN
    -- En pause : une seule capture de test par exécution pour détecter la reprise.
    RETURN 'probe';
  END IF;

  RETURN 'run';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_background_job(
  p_job_key text,
  p_error text DEFAULT NULL,
  p_resume boolean DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.background_jobs
  SET lease_until = NULL,
      last_error = p_error,
      consecutive_failures = CASE WHEN p_error IS NULL THEN 0 ELSE consecutive_failures + 1 END,
      status = CASE WHEN p_resume THEN 'active' ELSE status END,
      paused_reason = CASE WHEN p_resume THEN NULL ELSE paused_reason END
  WHERE job_key = p_job_key;
$$;

CREATE OR REPLACE FUNCTION public.pause_background_job(p_job_key text, p_reason text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.background_jobs
  SET status = 'paused', paused_reason = p_reason, lease_until = NULL, last_error = p_reason
  WHERE job_key = p_job_key;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_background_job(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_background_job(text, text, boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pause_background_job(text, text) FROM anon, authenticated;

SELECT cron.schedule('auto-moderate-captures-batch', '15 */2 * * *', $$
  SELECT net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/auto-moderate-capture',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := '{"batch": true, "limit": 10, "trigger": "cron"}'::jsonb
  ) AS request_id;
$$);