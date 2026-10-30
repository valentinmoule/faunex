CREATE INDEX IF NOT EXISTS animals_sci_lower_btrim_idx ON public.animals (lower(btrim(scientific_name)));
CREATE INDEX IF NOT EXISTS animals_name_lower_btrim_idx ON public.animals (lower(btrim(name)));

-- Memoize the full-catalogue scan per transaction: bulk renames check the same profile text for every capture.
CREATE OR REPLACE FUNCTION public.profile_mentions_other_species(p_target text, p_text text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k text := 'faunex.pmos_' || md5(coalesce(p_target,'') || chr(1) || left(coalesce(p_text,''),500)); v text; r boolean;
BEGIN
 v := current_setting(k, true);
 IF v IN ('t','f') THEN RETURN v='t'; END IF;
 SELECT EXISTS (SELECT 1 FROM public.animals a
 WHERE length(a.name)>8
 AND left(coalesce(p_text,''),500) ILIKE '%' || a.name || '%'
 AND a.scientific_name ~ '^[A-Z][a-z]+ [a-z-]+'
 AND public.normalize_animal_label(a.name) <> public.normalize_animal_label(p_target)
 AND position(public.normalize_animal_label(a.name) in public.normalize_animal_label(p_target))=0
 AND NOT EXISTS (SELECT 1 FROM public.animals target WHERE public.normalize_animal_label(target.name)=public.normalize_animal_label(p_target) AND lower(btrim(target.scientific_name))=lower(btrim(a.scientific_name)))
 ) INTO r;
 PERFORM set_config(k, CASE WHEN r THEN 't' ELSE 'f' END, true);
 RETURN r;
END $function$;