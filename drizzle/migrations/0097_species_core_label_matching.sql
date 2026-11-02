CREATE OR REPLACE FUNCTION public.species_core_label(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
 SELECT nullif(btrim(regexp_replace(regexp_replace(
   ' ' || coalesce(public.singular_animal_label(p),'') || ' ',
   ' (de|du|des|d|la|le|les|l|au|aux|en|et|a|race|type) ', ' ', 'g'),
   '^ (chien|chat|cheval|poney|lapin|chevre|mouton|vache|cochon|poule|coq) (?=[a-z]{4,})', ' ')),'');
$$;

CREATE OR REPLACE FUNCTION public.catalogue_species_candidates(p_name text, p_scientific text)
 RETURNS TABLE(name text, scientific_name text, priority integer, distance integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
 WITH cfg AS (
 SELECT nullif(btrim(public.normalize_animal_label(public.strip_label_parenthetical(p_name))),'') nn,
        nullif(btrim(public.normalize_animal_label(p_scientific)),'') ns,
        public.species_core_label(public.strip_label_parenthetical(p_name)) nc
 ), entries AS (
 SELECT a.name n,a.scientific_name s,a.name label FROM public.animals a
 UNION
 SELECT t.vernacular_name,t.scientific_name,t.vernacular_name FROM public.taxa t
 WHERE t.merged_into IS NULL AND t.status='validated'
 UNION
 SELECT coalesce(a.name,t.vernacular_name),coalesce(a.scientific_name,t.scientific_name),sy.label
 FROM public.taxon_synonyms sy JOIN public.taxa t ON t.id=sy.taxon_id
 LEFT JOIN public.animals a ON a.taxon_id=t.id
 WHERE t.merged_into IS NULL AND t.status='validated'
 ), normalized AS (
 SELECT e.*,btrim(public.normalize_animal_label(e.label)) nl,btrim(public.normalize_animal_label(e.s)) sci,
        public.species_core_label(e.label) core FROM entries e
 ), candidates AS (
 SELECT e.n,e.s,
 CASE WHEN e.nl=cfg.nn THEN 0
      WHEN e.sci=coalesce(cfg.ns,cfg.nn) AND NOT public.is_shared_domestic_binomial(e.s)
       AND NOT EXISTS(SELECT 1 FROM taxa t WHERE t.merged_into IS NULL AND public.normalize_animal_label(t.scientific_name)=e.sci AND (t.is_domestic OR t.rank='group'))
       AND (SELECT count(DISTINCT a.name) FROM animals a WHERE public.normalize_animal_label(a.scientific_name)=e.sci)<=1 THEN 1
      WHEN public.singular_animal_label(e.nl)=public.singular_animal_label(cfg.nn) THEN 2
      WHEN length(cfg.nc)>=4 AND e.core=cfg.nc THEN 2
      ELSE 3 END pr,
 least(public.species_label_distance(e.nl,cfg.nn),
       CASE WHEN length(cfg.nc)>=7 THEN public.species_label_distance(e.core,cfg.nc) ELSE 99 END) dist
 FROM normalized e CROSS JOIN cfg
 WHERE (cfg.ns IS NULL OR nullif(e.sci,'') IS NULL OR e.sci=cfg.ns)
   AND (e.nl=cfg.nn OR e.sci=coalesce(cfg.ns,cfg.nn)
    OR public.singular_animal_label(e.nl)=public.singular_animal_label(cfg.nn)
    OR (length(cfg.nc)>=4 AND e.core=cfg.nc)
    OR (length(cfg.nn)>=7 AND abs(length(e.nl)-length(cfg.nn))<=2
      AND regexp_replace(e.nl,'[^0-9]','','g')=regexp_replace(cfg.nn,'[^0-9]','','g')
      AND public.species_label_distance(e.nl,cfg.nn)<=CASE WHEN length(cfg.nn)>=12 THEN 2 ELSE 1 END)
    OR (length(cfg.nc)>=7 AND abs(length(e.core)-length(cfg.nc))<=2
      AND regexp_replace(e.nl,'[^0-9]','','g')=regexp_replace(cfg.nn,'[^0-9]','','g')
      AND public.species_label_distance(e.core,cfg.nc)<=CASE WHEN length(cfg.nc)>=12 THEN 2 ELSE 1 END))
 ) SELECT n,s,min(pr),min(dist) FROM candidates
   WHERE pr<3 OR dist<=CASE WHEN length((SELECT nn FROM cfg))>=12 THEN 2 ELSE 1 END
 GROUP BY n,s;
$function$;