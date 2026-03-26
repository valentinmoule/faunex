
-- Create explorer_follows table for unidirectional follow system
CREATE TABLE public.explorer_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.explorer_follows ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can see follows (for discovery)
CREATE POLICY "Authenticated can view all follows"
ON public.explorer_follows FOR SELECT TO authenticated
USING (true);

-- Users can follow others
CREATE POLICY "Users can insert own follows"
ON public.explorer_follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can delete own follows"
ON public.explorer_follows FOR DELETE TO authenticated
USING (auth.uid() = follower_id);

-- Grant XP when someone follows another user (both get XP)
CREATE OR REPLACE FUNCTION public.xp_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.grant_xp(NEW.follower_id, 10);
  PERFORM public.grant_xp(NEW.following_id, 10);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_follow_xp
AFTER INSERT ON public.explorer_follows
FOR EACH ROW EXECUTE FUNCTION public.xp_on_follow();

-- Notification when someone follows you
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'new_follower', NEW.follower_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_follow_notify
AFTER INSERT ON public.explorer_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
