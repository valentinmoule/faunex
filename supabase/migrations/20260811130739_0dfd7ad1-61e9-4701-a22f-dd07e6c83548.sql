CREATE TABLE public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text default 'live'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active', 'trialing', 'past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

-- Premium: captures illimitées (quota journalier ignoré)
CREATE OR REPLACE FUNCTION public.is_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_active_subscription(p_user_id, 'live')
      OR public.has_active_subscription(p_user_id, 'sandbox');
$$;

CREATE OR REPLACE FUNCTION public.captures_remaining_today()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_premium(auth.uid()) THEN 999
    ELSE GREATEST(0, 4 - (
      SELECT COUNT(*)::int FROM public.capture_attempts
      WHERE user_id = auth.uid()
        AND created_at >= date_trunc('day', now())
        AND created_at < date_trunc('day', now()) + interval '1 day'
    ))
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_capture_attempt()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  INSERT INTO public.capture_attempts (user_id) VALUES (v_user);

  IF public.is_premium(v_user) THEN
    RETURN 999;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.capture_attempts
  WHERE user_id = v_user
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day';

  IF v_count > 4 THEN
    RAISE EXCEPTION 'DAILY_CAPTURE_LIMIT_REACHED'
      USING HINT = 'Limite de 4 captures par jour atteinte.';
  END IF;

  RETURN GREATEST(0, 4 - v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_daily_capture_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF public.is_premium(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.captures
  WHERE user_id = NEW.user_id
    AND created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day';

  IF v_count >= 4 THEN
    RAISE EXCEPTION 'DAILY_CAPTURE_LIMIT_REACHED'
      USING HINT = 'Limite de 4 captures par jour atteinte.';
  END IF;

  RETURN NEW;
END;
$$;