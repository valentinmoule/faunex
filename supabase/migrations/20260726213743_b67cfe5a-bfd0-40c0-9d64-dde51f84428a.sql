-- 1. Storage: restrict capture image reads
DROP POLICY IF EXISTS "Capture images accessible by direct URL" ON storage.objects;

CREATE POLICY "Capture images readable by owner or when public"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'captures'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.captures c
      JOIN public.profiles p ON p.user_id = c.user_id
      WHERE c.image_url LIKE '%' || storage.objects.name
        AND c.status = 'approved'
        AND c.shared = true
        AND COALESCE(p.is_private, false) = false
    )
  )
);

-- 2. Profiles: explicit WITH CHECK on update
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Revoke public/anon EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_profile_counters(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_counters_on_capture_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_profile_private(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_animal(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_xp(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_last_login_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_badge(text, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_quest_reward(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_badge(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quest_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_animal(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_profile_private(uuid) TO service_role;