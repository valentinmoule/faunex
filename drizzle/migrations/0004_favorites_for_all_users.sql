DROP POLICY IF EXISTS "Premium add own capture favorites" ON public.capture_favorites;
CREATE POLICY "Add own capture favorites" ON public.capture_favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id AND c.user_id = auth.uid()));