CREATE TABLE public.user_collection_covers (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 collection_key text NOT NULL CHECK (length(collection_key) BETWEEN 1 AND 200),
 capture_id uuid NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
 PRIMARY KEY (user_id, collection_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_collection_covers TO authenticated;
GRANT ALL ON public.user_collection_covers TO service_role;
ALTER TABLE public.user_collection_covers ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_collection_cover_read ON public.user_collection_covers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_collection_cover_insert ON public.user_collection_covers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id AND c.user_id = auth.uid() AND c.image_url IS NOT NULL));
CREATE POLICY own_collection_cover_update ON public.user_collection_covers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id AND c.user_id = auth.uid() AND c.image_url IS NOT NULL));
CREATE POLICY own_collection_cover_delete ON public.user_collection_covers FOR DELETE TO authenticated USING (user_id = auth.uid());