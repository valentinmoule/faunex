CREATE TABLE IF NOT EXISTS public.paddle_customers (
  paddle_customer_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  name text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paddle_customers TO authenticated;
GRANT ALL ON public.paddle_customers TO service_role;

ALTER TABLE public.paddle_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paddle customer" ON public.paddle_customers;
CREATE POLICY "Users can view own paddle customer"
  ON public.paddle_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_paddle_customers_user_id ON public.paddle_customers(user_id);

DROP TRIGGER IF EXISTS update_paddle_customers_updated_at ON public.paddle_customers;
CREATE TRIGGER update_paddle_customers_updated_at
  BEFORE UPDATE ON public.paddle_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_change_action text,
  ADD COLUMN IF NOT EXISTS scheduled_change_at timestamptz;

CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
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
        -- active / trialing grant access regardless of any scheduled change
        (status IN ('active', 'trialing')
          AND (current_period_end IS NULL OR current_period_end > now()))
        -- paused / past_due / canceled keep access until the paid period ends
        OR (status IN ('paused', 'past_due', 'canceled')
          AND current_period_end IS NOT NULL
          AND current_period_end > now())
      )
  );
$$;