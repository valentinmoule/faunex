CREATE TABLE IF NOT EXISTS public.nearby_potentials_cache (
  zone_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nearby_potentials_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nearby_potentials_cache FROM anon, authenticated;
GRANT ALL ON public.nearby_potentials_cache TO service_role;