CREATE TABLE public.themed_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_en text,
  description text,
  cover_url text,
  species_names text[] NOT NULL DEFAULT '{}',
  rule_categories text[] NOT NULL DEFAULT '{}',
  rule_rarities text[] NOT NULL DEFAULT '{}',
  rule_keywords text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.themed_collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.themed_collections TO authenticated;
GRANT ALL ON public.themed_collections TO service_role;
ALTER TABLE public.themed_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published themed collections are visible" ON public.themed_collections
  FOR SELECT TO anon, authenticated
  USING (published OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage themed collections" ON public.themed_collections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER themed_collections_updated_at BEFORE UPDATE ON public.themed_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();