ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_email_likes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_follows boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push_likes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push_follows boolean NOT NULL DEFAULT true;