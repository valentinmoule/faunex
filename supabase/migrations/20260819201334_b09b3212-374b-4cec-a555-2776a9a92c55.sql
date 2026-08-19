-- Recreate trigger to keep profiles.last_login_at in sync with login_events
CREATE OR REPLACE FUNCTION public.update_last_login_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = NEW.created_at
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_login_at ON public.login_events;
CREATE TRIGGER trg_update_last_login_at
  AFTER INSERT ON public.login_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_login_at();

-- Backfill profiles.last_login_at from auth.users.last_sign_in_at
UPDATE public.profiles p
SET last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.last_login_at IS NULL OR p.last_login_at < u.last_sign_in_at);

-- Update cron jobs to use x-cron-secret (cron.schedule upserts existing jobs)
SELECT cron.schedule('send-reengagement-j2', '0 10 * * *', $$
  SELECT net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/send-reengagement',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
$$);

SELECT cron.schedule('send-no-capture-nudge-j7', '0 10 * * *', $$
  SELECT net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/send-no-capture-nudge',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
$$);

SELECT cron.schedule('send-inactivity-push-daily', '0 18 * * *', $$
  SELECT net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/send-inactivity-push',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) AS request_id;
$$);

-- New cron job for inactivity emails
SELECT cron.schedule('send-inactivity-email-daily', '0 11 * * *', $$
  SELECT net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/send-inactivity-email',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) AS request_id;
$$);