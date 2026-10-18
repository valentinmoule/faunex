REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored, created_at, updated_at, is_private, default_share_captures) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
DROP POLICY IF EXISTS "Anyone can view badges" ON public.user_badges;
CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT TO authenticated USING (
 user_id = auth.uid() OR NOT public.is_profile_private(user_id) OR public.has_role(auth.uid(), 'admin')
);