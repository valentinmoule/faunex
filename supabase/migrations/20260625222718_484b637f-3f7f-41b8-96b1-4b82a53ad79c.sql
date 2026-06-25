
-- 1. CAPTURES: restrict SELECT so non-owners can't see captures from private profiles
DROP POLICY IF EXISTS "Authenticated users can view all approved captures" ON public.captures;
CREATE POLICY "Authenticated can view approved non-private captures"
  ON public.captures FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = captures.user_id
          AND p.is_private = true
      )
    )
  );

-- 2. CAPTURES: round GPS coordinates to ~1km precision before storage to prevent
-- exact location leakage of sensitive wildlife observations.
CREATE OR REPLACE FUNCTION public.round_capture_coords()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL THEN
    NEW.latitude := round(NEW.latitude::numeric, 2)::double precision;
  END IF;
  IF NEW.longitude IS NOT NULL THEN
    NEW.longitude := round(NEW.longitude::numeric, 2)::double precision;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.round_capture_coords() FROM PUBLIC;

DROP TRIGGER IF EXISTS round_capture_coords_trigger ON public.captures;
CREATE TRIGGER round_capture_coords_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.round_capture_coords();

-- Round existing coordinates
UPDATE public.captures
SET latitude = round(latitude::numeric, 2)::double precision,
    longitude = round(longitude::numeric, 2)::double precision
WHERE latitude IS NOT NULL OR longitude IS NOT NULL;

-- 3. PROFILES: restrict the broad SELECT policy. Owners see all columns;
-- other authenticated users only get safe public columns via a dedicated view.
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Public view exposing only non-sensitive columns. Runs as view owner (postgres)
-- so it bypasses the owner-only RLS on profiles, but it only exposes safe fields.
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = false)
AS
SELECT
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
  is_private,
  created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 4. NOTIFICATIONS: remove client INSERT access. All notifications are created by
-- SECURITY DEFINER triggers (running as postgres, bypassing RLS) or by service_role
-- edge functions. No legitimate client-side notification creation exists.
DROP POLICY IF EXISTS "Authenticated can insert notifications as actor" ON public.notifications;

-- 5. SECURITY DEFINER FUNCTIONS: revoke EXECUTE from PUBLIC/authenticated for
-- functions that should only be called by triggers or service_role.
REVOKE EXECUTE ON FUNCTION public.grant_xp(uuid, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, authenticated, anon;

-- Trigger-only functions: not callable from API
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_request() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_accepted() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.xp_on_capture() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.xp_on_follow() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.xp_on_friend_accepted() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_quest_progress() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_regions_on_capture() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_last_login_at() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sync_animal_on_capture_approved() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.round_capture_coords() FROM PUBLIC, authenticated, anon;

-- Keep callable by authenticated users (used by app):
--   public.claim_quest_reward(uuid)  -- intentional user action
--   public.has_role(uuid, app_role)  -- used as RLS helper, returns bool, safe
