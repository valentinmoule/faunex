
ALTER TABLE public.user_department_subscriptions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'department',
  ADD COLUMN IF NOT EXISTS city_name text,
  ADD COLUMN IF NOT EXISTS city_postcode text;

ALTER TABLE public.user_department_subscriptions
  DROP CONSTRAINT IF EXISTS user_department_subscriptions_user_id_department_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_dept_subs_unique_dept
  ON public.user_department_subscriptions (user_id, department_code)
  WHERE kind = 'department';

CREATE UNIQUE INDEX IF NOT EXISTS user_dept_subs_unique_city
  ON public.user_department_subscriptions (user_id, city_name, city_postcode)
  WHERE kind = 'city';

ALTER TABLE public.user_department_subscriptions
  ADD CONSTRAINT user_dept_subs_kind_check
  CHECK (kind IN ('department','city'));
