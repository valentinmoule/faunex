-- Restore full table SELECT for authenticated (the column-level restriction broke
-- every `select *` on profiles, which cascaded into feed / Mon Faunex rendering).
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- anon keeps the public-columns-only read
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, user_id, display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored, created_at, updated_at) ON public.profiles TO anon;

GRANT ALL ON public.profiles TO service_role;