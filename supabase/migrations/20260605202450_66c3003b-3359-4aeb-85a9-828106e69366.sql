
-- Faune par département (peuplée via edge function avec service_role)
CREATE TABLE public.animal_departments (
  animal_name text NOT NULL,
  department_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (department_code, animal_name)
);
CREATE INDEX idx_animal_departments_dept ON public.animal_departments(department_code);
GRANT SELECT ON public.animal_departments TO authenticated;
GRANT ALL ON public.animal_departments TO service_role;
ALTER TABLE public.animal_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Animal departments viewable by authenticated"
  ON public.animal_departments FOR SELECT TO authenticated USING (true);

-- Rubriques départementales souscrites par l'utilisateur
CREATE TABLE public.user_department_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  department_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, department_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_department_subscriptions TO authenticated;
GRANT ALL ON public.user_department_subscriptions TO service_role;
ALTER TABLE public.user_department_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dept subs"
  ON public.user_department_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dept subs"
  ON public.user_department_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own dept subs"
  ON public.user_department_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
