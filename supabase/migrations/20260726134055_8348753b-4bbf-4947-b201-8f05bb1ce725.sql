ALTER TABLE public.captures
  DROP COLUMN IF EXISTS cutout_url,
  DROP COLUMN IF EXISTS cutout_status,
  DROP COLUMN IF EXISTS cutout_attempts;