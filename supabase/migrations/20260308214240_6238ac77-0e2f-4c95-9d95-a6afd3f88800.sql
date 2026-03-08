
-- Drop the old restrictive SELECT policy
DROP POLICY "Shared captures are viewable by everyone" ON public.captures;

-- New policy: authenticated users can see all approved captures + own captures
CREATE POLICY "Authenticated users can view all approved captures"
ON public.captures
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR status = 'approved');
