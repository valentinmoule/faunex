CREATE TABLE public.pinned_profile_collections (
  user_id uuid NOT NULL,
  collection_key text NOT NULL,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collection_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pinned_profile_collections TO authenticated;
GRANT ALL ON public.pinned_profile_collections TO service_role;

ALTER TABLE public.pinned_profile_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Showcase pins readable by authenticated users"
  ON public.pinned_profile_collections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert their own showcase pins"
  ON public.pinned_profile_collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own showcase pins"
  ON public.pinned_profile_collections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their own showcase pins"
  ON public.pinned_profile_collections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());