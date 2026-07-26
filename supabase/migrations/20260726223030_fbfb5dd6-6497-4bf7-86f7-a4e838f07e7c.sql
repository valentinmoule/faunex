-- The captures SELECT policy calls is_profile_private(); with EXECUTE revoked from
-- authenticated the whole policy evaluation failed, hiding every capture.
GRANT EXECUTE ON FUNCTION public.is_profile_private(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_private(uuid) TO service_role;