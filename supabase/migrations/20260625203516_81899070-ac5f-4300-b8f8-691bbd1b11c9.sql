
-- 1. push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subs"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. inactivity_notifications_log
CREATE TABLE public.inactivity_notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_inact_log_user_sent ON public.inactivity_notifications_log(user_id, sent_at DESC);

GRANT SELECT ON public.inactivity_notifications_log TO authenticated;
GRANT ALL ON public.inactivity_notifications_log TO service_role;

ALTER TABLE public.inactivity_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inactivity log"
  ON public.inactivity_notifications_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all inactivity log"
  ON public.inactivity_notifications_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. last_login_at on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

UPDATE public.profiles p
SET last_login_at = COALESCE(
  (SELECT MAX(created_at) FROM public.login_events WHERE user_id = p.user_id),
  p.updated_at
);

-- Trigger function: update profiles.last_login_at on login_events insert
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
