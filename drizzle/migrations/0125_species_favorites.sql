CREATE TABLE public.species_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  animal_name text NOT NULL CHECK (length(btrim(animal_name)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX species_favorites_user_name_key ON public.species_favorites (user_id, lower(btrim(animal_name)));

GRANT SELECT, INSERT, DELETE ON public.species_favorites TO authenticated;
GRANT ALL ON public.species_favorites TO service_role;

ALTER TABLE public.species_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own species favorites" ON public.species_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own species favorites" ON public.species_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own species favorites" ON public.species_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);