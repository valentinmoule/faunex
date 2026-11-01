CREATE OR REPLACE FUNCTION public.is_generic_domestic_chicken(p_name text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT lower(regexp_replace(btrim(coalesce(p_name,'')), '\s+', ' ', 'g')) ~ '^(poule|coq)( domestiques?)?( et (poule|coq)( domestiques?)?)?$'
     AND lower(regexp_replace(btrim(coalesce(p_name,'')), '\s+', ' ', 'g')) NOT IN ('poule domestique','coq domestique') $$;
INSERT INTO public.animal_merge_map(old_name,new_name)
SELECT v.o, v.n FROM (VALUES ('Coq','Coq domestique'),('Coqs domestiques','Coq domestique'),('Poule et coq domestiques','Poule domestique'),('Poules et coqs domestiques','Poule domestique'),('Coq et poule domestiques','Poule domestique')) v(o,n)
WHERE NOT EXISTS (SELECT 1 FROM public.animal_merge_map m WHERE lower(m.old_name)=lower(v.o));