ALTER TABLE public.user_department_subscriptions
  ADD COLUMN IF NOT EXISTS is_home boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS user_dept_subs_unique_home
  ON public.user_department_subscriptions (user_id)
  WHERE is_home = true;