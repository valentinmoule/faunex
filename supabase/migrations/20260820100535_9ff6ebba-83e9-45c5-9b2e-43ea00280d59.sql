CREATE TABLE public.user_species_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, collection_key)
);

GRANT SELECT, INSERT, DELETE ON public.user_species_collections TO authenticated;
GRANT ALL ON public.user_species_collections TO service_role;

ALTER TABLE public.user_species_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own species collections"
  ON public.user_species_collections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add their own species collections"
  ON public.user_species_collections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove their own species collections"
  ON public.user_species_collections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_species_collections_user ON public.user_species_collections (user_id);