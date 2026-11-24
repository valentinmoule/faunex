DROP POLICY IF EXISTS "Winners are public" ON public.photo_contest_winners;
CREATE POLICY "Winners are public" ON public.photo_contest_winners
FOR SELECT TO anon, authenticated
USING (
  user_id <> 'ac0df155-7422-4073-bfc1-14e2a71960bc'::uuid
  OR user_id = auth.uid()
);