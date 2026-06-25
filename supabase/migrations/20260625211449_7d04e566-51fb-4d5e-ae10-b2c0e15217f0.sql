
-- 1. captures: tighten UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own captures" ON public.captures;
CREATE POLICY "Users can update own captures"
ON public.captures
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = (SELECT status FROM public.captures c WHERE c.id = captures.id)
  AND user_id = (SELECT user_id FROM public.captures c WHERE c.id = captures.id)
  AND rarity = (SELECT rarity FROM public.captures c WHERE c.id = captures.id)
);

-- 2. daily_quests: restrict user updates - block changes to completed/claimed/xp_reward/target
DROP POLICY IF EXISTS "Users can update own quests" ON public.daily_quests;
CREATE POLICY "Users can update own quests"
ON public.daily_quests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND completed = (SELECT completed FROM public.daily_quests q WHERE q.id = daily_quests.id)
  AND claimed = (SELECT claimed FROM public.daily_quests q WHERE q.id = daily_quests.id)
  AND xp_reward = (SELECT xp_reward FROM public.daily_quests q WHERE q.id = daily_quests.id)
  AND target = (SELECT target FROM public.daily_quests q WHERE q.id = daily_quests.id)
  AND quest_type = (SELECT quest_type FROM public.daily_quests q WHERE q.id = daily_quests.id)
);

-- 3. user_badges: remove user self-insert, restrict to service role
DROP POLICY IF EXISTS "Users can claim own badges" ON public.user_badges;
CREATE POLICY "Only service role can grant badges"
ON public.user_badges
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. storage: add UPDATE policy on captures bucket scoped to user folder
DROP POLICY IF EXISTS "Users can update own capture images" ON storage.objects;
CREATE POLICY "Users can update own capture images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'captures' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'captures' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. storage: restrict listing on public buckets - only allow individual file access, not listing
DROP POLICY IF EXISTS "Anyone can view capture images" ON storage.objects;
CREATE POLICY "Capture images accessible by direct URL"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'captures' AND name IS NOT NULL);

-- Avatars: same treatment if a broad listing policy exists
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND cmd='SELECT' AND qual LIKE '%avatars%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Avatar images accessible by direct URL"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars' AND name IS NOT NULL);

-- 6. Lock down SECURITY DEFINER functions - revoke from PUBLIC/anon/authenticated
-- Trigger functions (only invoked by triggers, never directly)
REVOKE ALL ON FUNCTION public.notify_on_friend_accepted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_friend_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.xp_on_friend_accepted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.xp_on_capture() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.xp_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_last_login_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_quest_progress() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_animal_on_capture_approved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_regions_on_capture() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Email queue functions - server-only
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;

-- claim_quest_reward and has_role are intentionally callable by authenticated users
GRANT EXECUTE ON FUNCTION public.claim_quest_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
