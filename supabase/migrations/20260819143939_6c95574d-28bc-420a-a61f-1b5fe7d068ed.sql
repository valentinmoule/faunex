-- Phase 1 : structures additives uniquement
CREATE TYPE public.taxon_rank AS ENUM ('group','species','subspecies','breed');
CREATE TYPE public.taxon_scope AS ENUM ('france','monde');
CREATE TYPE public.taxon_status AS ENUM ('validated','pending','deprecated');
CREATE TYPE public.main_category AS ENUM (
  'Mammifères','Oiseaux','Reptiles','Amphibiens','Poissons',
  'Insectes','Arachnides','Crustacés','Mollusques',
  'Échinodermes','Cnidaires','Autres invertébrés','Autre (non animal)'
);

CREATE TABLE public.taxa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid REFERENCES public.taxa(id) ON DELETE SET NULL,
  rank public.taxon_rank NOT NULL,
  main_category public.main_category NOT NULL,
  vernacular_name text NOT NULL,
  scientific_name text,
  scientific_rank text,
  scope public.taxon_scope NOT NULL DEFAULT 'france',
  is_domestic boolean NOT NULL DEFAULT false,
  rarity text NOT NULL DEFAULT 'common',
  collectible boolean NOT NULL DEFAULT true,
  status public.taxon_status NOT NULL DEFAULT 'validated',
  merged_into uuid REFERENCES public.taxa(id) ON DELETE SET NULL,
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX taxa_unique_vernacular ON public.taxa (public.normalize_animal_label(vernacular_name), rank);
CREATE INDEX taxa_parent_idx ON public.taxa (parent_id);
CREATE INDEX taxa_category_idx ON public.taxa (main_category);
CREATE INDEX taxa_sci_idx ON public.taxa (public.normalize_animal_label(scientific_name));

GRANT SELECT ON public.taxa TO anon, authenticated;
GRANT ALL ON public.taxa TO service_role;
ALTER TABLE public.taxa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Taxa are readable by everyone" ON public.taxa FOR SELECT USING (true);
CREATE POLICY "Admins manage taxa" ON public.taxa FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.taxon_synonyms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  taxon_id uuid NOT NULL REFERENCES public.taxa(id) ON DELETE CASCADE,
  label text NOT NULL,
  normalized_label text NOT NULL,
  kind text NOT NULL DEFAULT 'synonym',
  lang text NOT NULL DEFAULT 'fr',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX taxon_synonyms_unique_label ON public.taxon_synonyms (normalized_label);
CREATE INDEX taxon_synonyms_taxon_idx ON public.taxon_synonyms (taxon_id);

GRANT SELECT ON public.taxon_synonyms TO anon, authenticated;
GRANT ALL ON public.taxon_synonyms TO service_role;
ALTER TABLE public.taxon_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Synonyms are readable by everyone" ON public.taxon_synonyms FOR SELECT USING (true);
CREATE POLICY "Admins manage synonyms" ON public.taxon_synonyms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'specialized',
  is_premium boolean NOT NULL DEFAULT false,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon, authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collections are readable by everyone" ON public.collections FOR SELECT USING (true);
CREATE POLICY "Admins manage collections" ON public.collections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.collection_taxa (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  taxon_id uuid NOT NULL REFERENCES public.taxa(id) ON DELETE CASCADE,
  is_core boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, taxon_id)
);
CREATE INDEX collection_taxa_taxon_idx ON public.collection_taxa (taxon_id);
GRANT SELECT ON public.collection_taxa TO anon, authenticated;
GRANT ALL ON public.collection_taxa TO service_role;
ALTER TABLE public.collection_taxa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collection members are readable by everyone" ON public.collection_taxa FOR SELECT USING (true);
CREATE POLICY "Admins manage collection members" ON public.collection_taxa FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_taxa_updated_at BEFORE UPDATE ON public.taxa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Liens additifs (nullable) vers le nouveau référentiel : aucune écriture pour l'instant
ALTER TABLE public.animals ADD COLUMN taxon_id uuid REFERENCES public.taxa(id) ON DELETE SET NULL;
ALTER TABLE public.captures ADD COLUMN taxon_id uuid REFERENCES public.taxa(id) ON DELETE SET NULL;
ALTER TABLE public.ml_dataset_events ADD COLUMN taxon_id uuid REFERENCES public.taxa(id) ON DELETE SET NULL;
ALTER TABLE public.animal_departments ADD COLUMN taxon_id uuid REFERENCES public.taxa(id) ON DELETE SET NULL;
CREATE INDEX captures_taxon_idx ON public.captures (taxon_id);
CREATE INDEX animals_taxon_idx ON public.animals (taxon_id);