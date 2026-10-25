CREATE TABLE public.profile_capture_order (
  user_id uuid PRIMARY KEY,
  capture_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profile_capture_order IS 'Ordre personnalisé des captures choisi par l''utilisateur, affiché sur son profil public.';

GRANT SELECT ON public.profile_capture_order TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profile_capture_order TO authenticated;
GRANT ALL ON public.profile_capture_order TO service_role;

ALTER TABLE public.profile_capture_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Capture order is publicly readable"
ON public.profile_capture_order
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage their own capture order"
ON public.profile_capture_order
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());