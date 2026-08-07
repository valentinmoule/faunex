CREATE UNIQUE INDEX IF NOT EXISTS captures_unique_species_per_user
ON public.captures (user_id, lower(btrim(animal_name)))
WHERE status = 'approved';