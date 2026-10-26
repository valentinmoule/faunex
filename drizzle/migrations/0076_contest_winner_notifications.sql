ALTER TABLE public.photo_contest_winners ADD COLUMN email_notified_at timestamptz;
ALTER TABLE public.photo_contest_winners ADD COLUMN push_notified_at timestamptz;
-- Existing demo/historical wins must not generate retrospective messages.
UPDATE public.photo_contest_winners SET email_notified_at = now(), push_notified_at = now();
GRANT EXECUTE ON FUNCTION public.contest_finalize() TO service_role;

CREATE OR REPLACE FUNCTION public.request_contest_winner_notification(p_week date)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE source_command text; source_headers jsonb; source_url text; request_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.photo_contest_winners w WHERE w.week_start = p_week AND (w.email_notified_at IS NULL OR w.push_notified_at IS NULL)) THEN RETURN NULL; END IF;
  -- Reuse the configured internal job credentials without exposing them.
  SELECT command INTO source_command FROM cron.job WHERE jobname = 'auto-moderate-captures';
  source_headers := substring(source_command FROM 'headers\s*:?=\s*''([^'']+)''')::jsonb;
  source_url := substring(source_command FROM 'url\s*:?=\s*''([^'']+)''');
  IF source_headers->>'x-cron-secret' IS NULL OR source_url IS NULL THEN RAISE EXCEPTION 'contest_notification_config_unavailable'; END IF;
  SELECT net.http_post(
    url := regexp_replace(source_url, '/functions/v1/[^/]+$', '/functions/v1/notify-contest-winner'),
    headers := source_headers, body := jsonb_build_object('week_start', p_week), timeout_milliseconds := 20000
  ) INTO request_id;
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.request_contest_winner_notification(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_contest_winner_notification(date) TO service_role;

CREATE OR REPLACE FUNCTION public.on_contest_winner_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.request_contest_winner_notification(NEW.week_start);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.on_contest_winner_notification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contest_winner_notification AFTER INSERT ON public.photo_contest_winners FOR EACH ROW EXECUTE FUNCTION public.on_contest_winner_notification();

CREATE OR REPLACE FUNCTION public.tick_contest_results()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE wk date;
BEGIN
  PERFORM public.contest_finalize();
  FOR wk IN SELECT w.week_start FROM public.photo_contest_winners w WHERE w.email_notified_at IS NULL OR w.push_notified_at IS NULL LOOP
    PERFORM public.request_contest_winner_notification(wk);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.tick_contest_results() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tick_contest_results() TO service_role;
DO $$ BEGIN
  PERFORM cron.schedule('contest-results', '3 * * * *', 'SELECT public.tick_contest_results();');
END $$;