CREATE TABLE public.species_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  species_name text NOT NULL CHECK (length(species_name) BETWEEN 1 AND 200),
  scientific_name text CHECK (scientific_name IS NULL OR length(scientific_name) <= 200),
  reason text CHECK (reason IS NULL OR length(reason) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX species_reports_one_pending ON public.species_reports (user_id, lower(species_name)) WHERE status = 'pending';
GRANT SELECT, INSERT, UPDATE ON public.species_reports TO authenticated;
GRANT ALL ON public.species_reports TO service_role;
ALTER TABLE public.species_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users report species" ON public.species_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins read reports" ON public.species_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.species_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));