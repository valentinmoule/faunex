GRANT DELETE ON public.profiles TO authenticated;
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Anyone can view badges" ON public.user_badges;
CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT TO authenticated USING (
 user_id = auth.uid() OR NOT public.is_profile_private(user_id) OR public.has_role(auth.uid(), 'admin')
 OR EXISTS (SELECT 1 FROM public.explorer_follows f WHERE f.follower_id = auth.uid() AND f.following_id = user_badges.user_id AND f.status = 'accepted')
);
REVOKE EXECUTE ON FUNCTION public.league_add_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_add_points(uuid, integer) TO service_role;