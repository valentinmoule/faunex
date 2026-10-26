CREATE POLICY "Accepted followers can view private approved captures" ON public.captures FOR SELECT TO authenticated
USING (status = 'approved' AND shared = true AND EXISTS (
  SELECT 1 FROM public.explorer_follows f
  WHERE f.follower_id = auth.uid() AND f.following_id = captures.user_id AND f.status = 'accepted'
));