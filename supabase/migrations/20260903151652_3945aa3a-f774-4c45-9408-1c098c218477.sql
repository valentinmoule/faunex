-- English localization of species names and species facts.

ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.taxa ADD COLUMN IF NOT EXISTS vernacular_name_en text;

ALTER TABLE public.species_profiles
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS habitat_en text,
  ADD COLUMN IF NOT EXISTS diet_en text,
  ADD COLUMN IF NOT EXISTS fun_fact_en text,
  ADD COLUMN IF NOT EXISTS translated_en_at timestamptz;

CREATE INDEX IF NOT EXISTS animals_pending_en_idx ON public.animals (created_at) WHERE name_en IS NULL;

-- Public read of the FR -> EN species name mapping (client-side cache).
CREATE OR REPLACE FUNCTION public.species_names_en()
RETURNS TABLE(name text, name_en text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.name, a.name_en
  FROM public.animals a
  WHERE a.name_en IS NOT NULL AND a.name_en <> ''
  ORDER BY a.name
$function$;

GRANT EXECUTE ON FUNCTION public.species_names_en() TO anon, authenticated;

-- English species fact sheet, when it has already been translated.
CREATE OR REPLACE FUNCTION public.species_profile_en(p_name text, p_scientific text DEFAULT NULL::text)
RETURNS TABLE(description_en text, habitat_en text, diet_en text, fun_fact_en text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT sp.description_en, sp.habitat_en, sp.diet_en, sp.fun_fact_en
  FROM public.species_profiles sp
  WHERE sp.description_en IS NOT NULL
    AND (
      sp.normalized_name = public.normalize_animal_label(p_name)
      OR (
        p_scientific IS NOT NULL AND p_scientific <> ''
        AND sp.normalized_scientific = public.normalize_animal_label(p_scientific)
      )
    )
  ORDER BY (sp.normalized_name = public.normalize_animal_label(p_name)) DESC,
           sp.updated_at DESC
  LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.species_profile_en(text, text) TO authenticated;

-- Progress helper for the admin batch translation job.
CREATE OR REPLACE FUNCTION public.species_translation_progress()
RETURNS TABLE(total bigint, translated bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*), count(*) FILTER (WHERE name_en IS NOT NULL AND name_en <> '')
  FROM public.animals
$function$;

GRANT EXECUTE ON FUNCTION public.species_translation_progress() TO authenticated;