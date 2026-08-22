DO $$
DECLARE a boolean; b boolean;
BEGIN
  a := public.try_claim_notification('selftest-dedupe', 600);
  b := public.try_claim_notification('selftest-dedupe', 600);
  IF a IS NOT TRUE OR b IS NOT FALSE THEN
    RAISE EXCEPTION 'dedupe lock broken: first=% second=%', a, b;
  END IF;
  DELETE FROM public.notification_dedupe WHERE key = 'selftest-dedupe';
END $$;