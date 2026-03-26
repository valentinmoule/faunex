
-- Allow authenticated users to see accepted friend relations of other users (for friend-of-friend discovery)
CREATE POLICY "Authenticated can view accepted relations"
ON public.explorer_friends
FOR SELECT
TO authenticated
USING (status = 'accepted');
