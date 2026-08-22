CREATE TABLE IF NOT EXISTS public.notification_dedupe (
  key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notification_dedupe TO service_role;
ALTER TABLE public.notification_dedupe ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.try_claim_notification(p_key text, p_ttl_seconds integer DEFAULT 600)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  INSERT INTO public.notification_dedupe (key)
  VALUES (p_key)
  ON CONFLICT (key) DO UPDATE
    SET created_at = now()
    WHERE public.notification_dedupe.created_at
          < now() - make_interval(secs => GREATEST(COALESCE(p_ttl_seconds, 600), 1))
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.try_claim_notification(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_claim_notification(text, integer) TO service_role;