ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_share_captures BOOLEAN NOT NULL DEFAULT true;
UPDATE public.captures SET shared = true WHERE shared = false AND status = 'approved';