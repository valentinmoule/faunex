ALTER TABLE public.custom_collections ADD COLUMN pinned_at timestamptz;

COMMENT ON COLUMN public.custom_collections.pinned_at IS 'Date d''épinglage sur la vitrine du profil ; NULL = non épinglée.';

CREATE POLICY "Pinned custom collections are visible"
ON public.custom_collections
FOR SELECT
TO authenticated
USING (pinned_at IS NOT NULL);

CREATE POLICY "Pinned custom collection items are visible"
ON public.custom_collection_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.custom_collections c
    WHERE c.id = collection_id AND c.pinned_at IS NOT NULL
  )
);