CREATE OR REPLACE FUNCTION public.profile_mentions_other_species(p_target text,p_text text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (
 SELECT 1 FROM public.animals a
 WHERE public.normalize_animal_label(a.name) <> public.normalize_animal_label(p_target)
 AND length(a.name)>8
 AND a.scientific_name ~ '^[A-Z][a-z]+ [a-z-]+'
 AND position(public.normalize_animal_label(a.name) in public.normalize_animal_label(p_target))=0
 AND NOT EXISTS (SELECT 1 FROM public.animals target WHERE public.normalize_animal_label(target.name)=public.normalize_animal_label(p_target) AND lower(btrim(target.scientific_name))=lower(btrim(a.scientific_name)))
 AND public.normalize_animal_label(left(coalesce(p_text,''),500)) LIKE '%' || public.normalize_animal_label(a.name) || '%'
 );
$$;