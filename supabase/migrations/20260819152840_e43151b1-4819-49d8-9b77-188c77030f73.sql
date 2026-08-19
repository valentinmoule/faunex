CREATE TABLE public.animal_merge_map (
  old_name text PRIMARY KEY,
  new_name text NOT NULL,
  mode text NOT NULL DEFAULT 'merge',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.animal_merge_map TO service_role;
ALTER TABLE public.animal_merge_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read merge map" ON public.animal_merge_map FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));