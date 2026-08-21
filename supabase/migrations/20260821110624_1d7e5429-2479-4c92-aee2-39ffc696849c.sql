CREATE OR REPLACE FUNCTION public.trigger_auto_moderate_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending_review' THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status
  FROM public.background_jobs
  WHERE job_key = 'auto_moderate_captures';

  -- Job en pause (crédits IA épuisés, etc.) : on laisse la modération manuelle.
  IF COALESCE(v_status, 'idle') = 'paused' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/auto-moderate-capture',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
      body := jsonb_build_object('capture_id', NEW.id, 'trigger', 'stream')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Jamais bloquer l'enregistrement de la capture si l'appel échoue.
    RAISE WARNING 'auto-moderate trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_auto_moderate_capture() FROM PUBLIC, anon, authenticated;