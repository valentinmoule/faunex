CREATE TABLE public.custom_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_collections TO authenticated;
GRANT ALL ON public.custom_collections TO service_role;
ALTER TABLE public.custom_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own custom collections"
ON public.custom_collections
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TABLE public.custom_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.custom_collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  animal_name text NOT NULL,
  scientific_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, animal_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_collection_items TO authenticated;
GRANT ALL ON public.custom_collection_items TO service_role;
ALTER TABLE public.custom_collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own custom collection items"
ON public.custom_collection_items
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_premium_custom_collection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_premium(NEW.user_id) THEN
    RAISE EXCEPTION 'custom collections require premium';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custom_collections_premium
BEFORE INSERT ON public.custom_collections
FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_custom_collection();