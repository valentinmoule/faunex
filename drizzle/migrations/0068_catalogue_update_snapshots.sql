CREATE TABLE public.catalogue_update_snapshots (batch_key text NOT NULL, relation_name text NOT NULL, row_key text NOT NULL, row_data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(batch_key, relation_name, row_key));
GRANT ALL ON public.catalogue_update_snapshots TO service_role;
ALTER TABLE public.catalogue_update_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_only_catalogue_snapshots ON public.catalogue_update_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
COMMENT ON TABLE public.catalogue_update_snapshots IS 'Service-only targeted before-images for approved catalogue updates; never expose capture snapshots to clients.';