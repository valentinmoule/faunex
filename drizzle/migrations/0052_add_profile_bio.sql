ALTER TABLE public.profiles ADD COLUMN bio text;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_max_length CHECK (bio IS NULL OR char_length(bio) <= 150);

GRANT SELECT (bio) ON public.profiles TO authenticated;
GRANT UPDATE (bio) ON public.profiles TO authenticated;