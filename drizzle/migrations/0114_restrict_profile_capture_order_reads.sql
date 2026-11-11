DROP POLICY IF EXISTS "Capture order is publicly readable" ON public.profile_capture_order;

CREATE POLICY "Capture order visible to those who can see the profile captures"
ON public.profile_capture_order
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_staff(auth.uid())
  OR NOT public.is_profile_private(user_id)
  OR EXISTS (
    SELECT 1 FROM public.explorer_follows f
    WHERE f.follower_id = auth.uid()
      AND f.following_id = profile_capture_order.user_id
      AND f.status = 'accepted'
  )
);