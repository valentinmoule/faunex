CREATE INDEX IF NOT EXISTS captures_animal_name_lower_idx
  ON public.captures (lower(btrim(animal_name)));