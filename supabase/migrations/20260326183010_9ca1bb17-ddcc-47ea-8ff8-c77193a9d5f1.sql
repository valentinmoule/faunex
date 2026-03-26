
-- Fix permissive INSERT policy: restrict to service_role for inserts
DROP POLICY "Service can insert quests" ON public.daily_quests;

CREATE POLICY "Service role can insert quests"
  ON public.daily_quests FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');
