ALTER TABLE public.captures
  ADD COLUMN IF NOT EXISTS cutout_url text,
  ADD COLUMN IF NOT EXISTS cutout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cutout_attempts integer NOT NULL DEFAULT 0;