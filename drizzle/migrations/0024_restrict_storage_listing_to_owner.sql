DROP POLICY IF EXISTS "Avatar images accessible by direct URL" ON storage.objects;
CREATE POLICY "Avatar images accessible by direct URL" ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "Capture images readable by owner or when public" ON storage.objects;
CREATE POLICY "Capture images readable by owner or when public" ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id = 'captures' AND (storage.foldername(name))[1] = auth.uid()::text
);