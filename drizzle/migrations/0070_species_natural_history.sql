CREATE TABLE public.species_natural_history (
 animal_id uuid PRIMARY KEY REFERENCES public.animals(id) ON DELETE CASCADE,
 scientific_name text NOT NULL,
 phylum text, class_name text, order_name text, family text,
 gbif_key bigint,
 measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
 sources jsonb NOT NULL DEFAULT '[]'::jsonb,
 checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.species_natural_history TO authenticated;
GRANT ALL ON public.species_natural_history TO service_role;
ALTER TABLE public.species_natural_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated natural history reads" ON public.species_natural_history FOR SELECT TO authenticated USING (true);
COMMENT ON TABLE public.species_natural_history IS 'Shared exact-identity taxonomy and explicitly sourced adult measurements; unknown averages remain absent. Service-only writes.';