CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  capture_id uuid NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX stories_user_expires_idx ON public.stories(user_id, expires_at);
GRANT SELECT, INSERT, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or followed active stories" ON public.stories FOR SELECT TO authenticated
USING (expires_at > now() AND (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.explorer_follows f WHERE f.follower_id = auth.uid() AND f.following_id = stories.user_id AND f.status = 'accepted')));
CREATE POLICY "Add own approved captures" ON public.stories FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND expires_at <= now() + interval '24 hours 1 minute' AND EXISTS (
  SELECT 1 FROM public.captures c WHERE c.id = capture_id AND c.user_id = auth.uid() AND c.status = 'approved'));
CREATE POLICY "Delete own stories" ON public.stories FOR DELETE TO authenticated USING (user_id = auth.uid());