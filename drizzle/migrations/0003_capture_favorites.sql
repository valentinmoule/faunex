CREATE TABLE public.capture_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  capture_id uuid NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, capture_id)
);
GRANT SELECT, INSERT, DELETE ON public.capture_favorites TO authenticated;
GRANT ALL ON public.capture_favorites TO service_role;
ALTER TABLE public.capture_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own favorites read" ON public.capture_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Premium add own capture favorites" ON public.capture_favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid())
    AND EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id AND c.user_id = auth.uid()));
CREATE POLICY "Own favorites delete" ON public.capture_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);