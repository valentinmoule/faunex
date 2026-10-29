CREATE OR REPLACE FUNCTION public.species_label_distance(p_left text, p_right text)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE a text:=coalesce(p_left,''); b text:=coalesce(p_right,''); prev integer[]; cur integer[]; i integer; j integer;
BEGIN
 IF abs(length(a)-length(b))>2 OR greatest(length(a),length(b))>160 THEN RETURN 3; END IF;
 prev:=ARRAY(SELECT generate_series(0,length(b)));
 FOR i IN 1..length(a) LOOP
   cur:=ARRAY[i];
   FOR j IN 1..length(b) LOOP
     cur:=array_append(cur,least(cur[j]+1,prev[j+1]+1,prev[j]+CASE WHEN substr(a,i,1)=substr(b,j,1) THEN 0 ELSE 1 END));
   END LOOP;
   prev:=cur;
 END LOOP;
 RETURN prev[length(b)+1];
END $$;
CREATE OR REPLACE FUNCTION public.catalogue_species_candidates(p_name text,p_scientific text)
RETURNS TABLE(name text,scientific_name text,priority integer,distance integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH cfg AS (
 SELECT nullif(btrim(public.normalize_animal_label(public.strip_label_parenthetical(p_name))),'') nn,
        nullif(btrim(public.normalize_animal_label(p_scientific)),'') ns
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
 SELECT e.*,btrim(public.normalize_animal_label(e.label)) nl,btrim(public.normalize_animal_label(e.s)) sci FROM entries e
 ), candidates AS (
 SELECT e.n,e.s,
 CASE WHEN e.nl=cfg.nn THEN 0
      WHEN e.sci=coalesce(cfg.ns,cfg.nn) AND NOT public.is_shared_domestic_binomial(e.s)
       AND NOT EXISTS(SELECT 1 FROM taxa t WHERE t.merged_into IS NULL AND public.normalize_animal_label(t.scientific_name)=e.sci AND (t.is_domestic OR t.rank='group'))
       AND (SELECT count(DISTINCT a.name) FROM animals a WHERE public.normalize_animal_label(a.scientific_name)=e.sci)<=1 THEN 1
      WHEN public.singular_animal_label(e.nl)=public.singular_animal_label(cfg.nn) THEN 2
      ELSE 3 END pr,
 public.species_label_distance(e.nl,cfg.nn) dist
 FROM normalized e CROSS JOIN cfg
 WHERE (cfg.ns IS NULL OR nullif(e.sci,'') IS NULL OR e.sci=cfg.ns)
   AND (e.nl=cfg.nn OR e.sci=coalesce(cfg.ns,cfg.nn)
    OR public.singular_animal_label(e.nl)=public.singular_animal_label(cfg.nn)
    OR (length(cfg.nn)>=7 AND abs(length(e.nl)-length(cfg.nn))<=2
      AND regexp_replace(e.nl,'[^0-9]','','g')=regexp_replace(cfg.nn,'[^0-9]','','g')
      AND public.species_label_distance(e.nl,cfg.nn)<=CASE WHEN length(cfg.nn)>=12 THEN 2 ELSE 1 END))
 ) SELECT n,s,min(pr),min(dist) FROM candidates WHERE pr<3 OR dist<=CASE WHEN length((SELECT nn FROM cfg))>=12 THEN 2 ELSE 1 END
 GROUP BY n,s;
$$;
REVOKE ALL ON FUNCTION public.catalogue_species_candidates(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.catalogue_species_candidates(text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.resolve_species_identity(p_name text,p_scientific text)
RETURNS TABLE(name text,scientific_name text,matched boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE best record; other record; nn text:=nullif(btrim(public.normalize_animal_label(public.strip_label_parenthetical(p_name))),''); ns text:=nullif(btrim(public.normalize_animal_label(p_scientific)),'');
BEGIN
 IF ns IS NOT NULL AND EXISTS(SELECT 1 FROM animals a WHERE public.normalize_animal_label(a.name)=nn AND nullif(public.normalize_animal_label(a.scientific_name),'') IS NOT NULL AND public.normalize_animal_label(a.scientific_name)<>ns) THEN
   RAISE EXCEPTION 'SPECIES_IDENTITY_CONFLICT: common and scientific names disagree';
 END IF;
 SELECT c.* INTO best FROM public.catalogue_species_candidates(p_name,p_scientific) c ORDER BY c.priority,c.distance,c.name LIMIT 1;
 IF best.name IS NULL THEN RETURN QUERY SELECT btrim(public.strip_label_parenthetical(p_name)),nullif(btrim(p_scientific),''),false; RETURN; END IF;
 SELECT c.* INTO other FROM public.catalogue_species_candidates(p_name,p_scientific) c WHERE c.name<>best.name ORDER BY c.priority,c.distance,c.name LIMIT 1;
 IF other.name IS NOT NULL AND other.priority=best.priority AND (best.priority<3 OR other.distance<=best.distance) THEN
   RAISE EXCEPTION 'AMBIGUOUS_SPECIES: verify the exact species name';
 END IF;
 RETURN QUERY SELECT best.name,best.scientific_name,true;
END $$;
CREATE OR REPLACE FUNCTION public.match_animal(p_name text,p_scientific text DEFAULT NULL)
RETURNS TABLE(id uuid,name text,scientific_name text,category text,rarity text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT a.id,a.name,a.scientific_name,a.category,a.rarity
 FROM public.resolve_species_identity(p_name,p_scientific) r JOIN public.animals a ON public.normalize_animal_label(a.name)=public.normalize_animal_label(r.name)
 WHERE r.matched LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.enforce_canonical_animal_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE res record;
BEGIN
 IF TG_TABLE_NAME='captures' THEN
  NEW.animal_name:=public.canonical_animal_name(NEW.animal_name);
  IF coalesce(NEW.animal_name,'')<>'' AND lower(NEW.animal_name)<>'inconnu' THEN
   SELECT * INTO res FROM public.resolve_species_identity(NEW.animal_name,NEW.scientific_name);
   IF res.matched THEN NEW.animal_name:=res.name; NEW.scientific_name:=coalesce(res.scientific_name,NEW.scientific_name); END IF;
  END IF;
 ELSE NEW.name:=public.canonical_animal_name(NEW.name);
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.guard_new_catalogue_species()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE res record;
BEGIN
 PERFORM pg_advisory_xact_lock(72590131);
 SELECT * INTO res FROM public.resolve_species_identity(NEW.name,NEW.scientific_name);
 IF res.matched THEN
  IF EXISTS(SELECT 1 FROM public.animals a WHERE public.normalize_animal_label(a.name)=public.normalize_animal_label(res.name)) THEN RETURN NULL; END IF;
  NEW.name:=res.name; NEW.scientific_name:=coalesce(res.scientific_name,NEW.scientific_name);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_guard_new_catalogue_species BEFORE INSERT ON public.animals FOR EACH ROW EXECUTE FUNCTION public.guard_new_catalogue_species();
REVOKE ALL ON FUNCTION public.guard_new_catalogue_species() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_new_catalogue_species() TO service_role;