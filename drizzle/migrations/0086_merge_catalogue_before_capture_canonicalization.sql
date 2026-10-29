DO $migration$
DECLARE original text; definition text; marker text := ' UPDATE public.captures SET animal_name=n,scientific_name=s,taxon_id=target_taxon WHERE lower(animal_name)=lower(a.name);';
BEGIN
 SELECT pg_get_functiondef('public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid)'::regprocedure) INTO original;
 IF position(marker IN original)=0 THEN RAISE EXCEPTION 'Unexpected report action definition'; END IF;
 definition := replace(original,marker,$replacement$
 -- Retire the source after recording its redirects, before capture triggers resolve the binomial.
 -- Otherwise the older source remains the preferred catalogue name and defeats the merge.
 IF p_action='merge' THEN
  DELETE FROM public.animal_merge_map WHERE lower(old_name)=lower(n);
  DELETE FROM public.animals WHERE id=a.id;
 END IF;
 UPDATE public.captures SET animal_name=n,scientific_name=s,taxon_id=target_taxon WHERE lower(animal_name)=lower(a.name);$replacement$);
 EXECUTE definition;
END $migration$;
COMMENT ON FUNCTION public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid) IS 'Admin-only transactional global corrections; merge retires the source before capture canonicalization, preserving photos and pending reports.';