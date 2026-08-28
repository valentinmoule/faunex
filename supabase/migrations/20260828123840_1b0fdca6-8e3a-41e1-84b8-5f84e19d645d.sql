select cron.unschedule('auto-moderate-captures') where exists (select 1 from cron.job where jobname='auto-moderate-captures');

select cron.schedule(
  'auto-moderate-captures',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pakwuooxumrghsbwczwx.supabase.co/functions/v1/auto-moderate-capture',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "B5stXlREPc4ty2pJGM1T98RdmJigdqrVR60E6RJdHeAzfciS"}'::jsonb,
    body := '{"batch": true, "limit": 10}'::jsonb,
    timeout_milliseconds := 20000
  ) AS request_id;
  $$
);