
-- Restore table-level grants on profiles (lost in security hardening migration).
-- Sensitive columns (notification prefs, marketing_emails) are still accessible to owners via get_my_profile() RPC.
-- Column-level SELECT here exposes only public profile fields. is_private is needed for the captures RLS subquery.
GRANT SELECT (
  id, user_id, display_name, username, avatar_url,
  level, xp, xp_to_next,
  species_count, total_captures, regions_explored,
  created_at, updated_at, is_private, last_login_at
) ON public.profiles TO authenticated, anon;

GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
