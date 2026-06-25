
-- 1. Captures: enforce 'shared' for non-owner reads
DROP POLICY IF EXISTS "Authenticated can view approved non-private captures" ON public.captures;
CREATE POLICY "Authenticated can view approved non-private captures"
ON public.captures
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    status = 'approved'
    AND shared = true
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = captures.user_id AND p.is_private = true
    )
  )
);

-- 2. Login events: allow users to read their own
CREATE POLICY "Users can read their own login events"
ON public.login_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Profiles: revoke column-level SELECT on sensitive columns from authenticated/anon
REVOKE SELECT (
  notify_email_likes,
  notify_email_comments,
  notify_email_follows,
  notify_push_likes,
  notify_push_comments,
  notify_push_follows,
  marketing_emails,
  is_private,
  last_login_at
) ON public.profiles FROM authenticated;

REVOKE SELECT (
  notify_email_likes,
  notify_email_comments,
  notify_email_follows,
  notify_push_likes,
  notify_push_comments,
  notify_push_follows,
  marketing_emails,
  is_private,
  last_login_at
) ON public.profiles FROM anon;

-- The captures SELECT policy sub-SELECT on profiles.is_private runs as the
-- query owner via the SECURITY DEFINER-like RLS evaluation context but the
-- column reference still requires the role to have SELECT on the column.
-- Wrap it in a SECURITY DEFINER helper so the policy keeps working.
CREATE OR REPLACE FUNCTION public.is_profile_private(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_private FROM public.profiles WHERE user_id = _user_id), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_profile_private(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_private(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can view approved non-private captures" ON public.captures;
CREATE POLICY "Authenticated can view approved non-private captures"
ON public.captures
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    status = 'approved'
    AND shared = true
    AND NOT public.is_profile_private(captures.user_id)
  )
);
