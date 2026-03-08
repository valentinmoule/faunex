
-- Add status column to captures: 'approved' (default for AI-identified), 'pending_review' (manual entry)
ALTER TABLE public.captures ADD COLUMN status text NOT NULL DEFAULT 'approved';

-- Update existing captures to approved
UPDATE public.captures SET status = 'approved' WHERE status = 'approved';

-- Allow admins to view all captures for moderation (public read on pending)
-- We'll use a simple approach: pending captures are visible to their owner + anyone authenticated can view for moderation
