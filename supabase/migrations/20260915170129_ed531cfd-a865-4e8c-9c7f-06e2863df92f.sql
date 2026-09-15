CREATE TABLE public.species_pages (
  slug text PRIMARY KEY,
  animal_name text NOT NULL,
  scientific_name text,
  category text,
  rarity text,
  iucn_status text,
  capture_count integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.species_pages TO anon;
GRANT SELECT ON public.species_pages TO authenticated;
GRANT ALL ON public.species_pages TO service_role;

ALTER TABLE public.species_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published species pages are public"
ON public.species_pages FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE INDEX species_pages_published_idx ON public.species_pages (published, capture_count DESC);

CREATE TRIGGER species_pages_updated_at
BEFORE UPDATE ON public.species_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.top_captured_species(p_limit integer DEFAULT 100)
RETURNS TABLE(animal_name text, scientific_name text, category text, rarity text, iucn_status text, captures bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.animal_name,
         max(a.scientific_name) AS scientific_name,
         max(a.category) AS category,
         max(a.rarity) AS rarity,
         max(a.iucn_status) AS iucn_status,
         count(*) AS captures
  FROM captures c
  LEFT JOIN animals a ON lower(a.name) = lower(c.animal_name)
  WHERE c.status = 'approved'
  GROUP BY c.animal_name
  ORDER BY count(*) DESC
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
$$;

REVOKE ALL ON FUNCTION public.top_captured_species(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.top_captured_species(integer) TO service_role;