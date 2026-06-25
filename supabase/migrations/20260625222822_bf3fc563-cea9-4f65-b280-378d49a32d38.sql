
-- Replace owner-only SELECT with a permissive policy + column-level grants.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP VIEW IF EXISTS public.profiles_public;

CREATE POLICY "Authenticated can view public profile columns"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Lock down column-level access. Authenticated may only read non-sensitive columns
-- directly from the table. Sensitive owner-only fields are read via get_my_profile().
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  user_id,
  username,
  display_name,
  avatar_url,
  level,
  xp,
  xp_to_next,
  species_count,
  total_captures,
  regions_explored,
  created_at
) ON public.profiles TO authenticated;
-- service_role keeps full access (bypasses RLS and has table-level grants by default).
GRANT ALL ON public.profiles TO service_role;

-- Owner-only access to the full profile (including sensitive prefs).
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
