
-- Captures table: stores identified animals
CREATE TABLE public.captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  animal_name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT,
  description TEXT,
  habitat TEXT,
  diet TEXT,
  conservation TEXT,
  fun_fact TEXT,
  rarity TEXT NOT NULL DEFAULT 'common',
  location TEXT,
  shared BOOLEAN NOT NULL DEFAULT false,
  caption TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;

-- Everyone can see shared captures
CREATE POLICY "Shared captures are viewable by everyone"
ON public.captures FOR SELECT
TO authenticated
USING (shared = true OR auth.uid() = user_id);

-- Users can insert their own captures
CREATE POLICY "Users can insert own captures"
ON public.captures FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own captures (e.g. share/unshare)
CREATE POLICY "Users can update own captures"
ON public.captures FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own captures
CREATE POLICY "Users can delete own captures"
ON public.captures FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Storage bucket for capture photos
INSERT INTO storage.buckets (id, name, public) VALUES ('captures', 'captures', true);

-- Storage policies
CREATE POLICY "Anyone can view capture images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'captures');

CREATE POLICY "Authenticated users can upload capture images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'captures');

CREATE POLICY "Users can delete own capture images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'captures' AND (storage.foldername(name))[1] = auth.uid()::text);
