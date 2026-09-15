UPDATE public.species_pages sp
SET content = jsonb_set(
      jsonb_set(
        sp.content,
        '{fr,name}', to_jsonb(sp.animal_name), true
      ),
      '{en,name}', to_jsonb(COALESCE(a.name_en, sp.animal_name)), true
    ),
    updated_at = now()
FROM public.animals a
WHERE lower(a.name) = lower(sp.animal_name)
  AND sp.content ? 'fr';