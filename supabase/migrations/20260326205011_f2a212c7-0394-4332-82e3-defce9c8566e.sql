
-- Add status to explorer_follows (pending/accepted)
ALTER TABLE public.explorer_follows ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';

-- Add is_private to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Update RLS: followers can only see accepted follows (or their own pending)
DROP POLICY IF EXISTS "Authenticated can view all follows" ON public.explorer_follows;
CREATE POLICY "Authenticated can view follows"
  ON public.explorer_follows FOR SELECT TO authenticated
  USING (
    status = 'accepted'
    OR follower_id = auth.uid()
    OR following_id = auth.uid()
  );

-- Allow target user to update follow status (accept/reject)
DROP POLICY IF EXISTS "Target can update follow status" ON public.explorer_follows;
CREATE POLICY "Target can update follow status"
  ON public.explorer_follows FOR UPDATE TO authenticated
  USING (following_id = auth.uid())
  WITH CHECK (following_id = auth.uid());
