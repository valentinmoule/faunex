-- Déclenchement immédiat de l'auto-modération à l'arrivée d'une capture en attente
CREATE OR REPLACE FUNCTION public.trigger_auto_moderate_capture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paused boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending_review' THEN
    RETURN NEW;
  END IF;

  -- Si le job de fond est en pause (crédits IA épuisés), on laisse le rattrapage gérer.
  SELECT COALESCE(is_paused, false) INTO v_paused
  FROM public.background_jobs
  WHERE job_key = 'auto_moderate_captures';

  IF COALESCE(v_paused, false) THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/auto-moderate-capture',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := jsonb_build_object('capture_id', NEW.id, 'trigger', 'stream')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS captures_auto_moderate_insert ON public.captures;
CREATE TRIGGER captures_auto_moderate_insert
AFTER INSERT ON public.captures
FOR EACH ROW
WHEN (NEW.status = 'pending_review')
EXECUTE FUNCTION public.trigger_auto_moderate_capture();

DROP TRIGGER IF EXISTS captures_auto_moderate_update ON public.captures;
CREATE TRIGGER captures_auto_moderate_update
AFTER UPDATE OF status ON public.captures
FOR EACH ROW
WHEN (NEW.status = 'pending_review' AND OLD.status IS DISTINCT FROM 'pending_review')
EXECUTE FUNCTION public.trigger_auto_moderate_capture();

-- Rattrapage plus fréquent pour les captures manquées / reprise après pause
SELECT cron.unschedule('auto-moderate-captures-batch');
SELECT cron.schedule(
  'auto-moderate-captures-batch',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/auto-moderate-capture',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := '{"batch": true, "limit": 10, "trigger": "cron"}'::jsonb
  ) AS request_id;
  $cron$
);
