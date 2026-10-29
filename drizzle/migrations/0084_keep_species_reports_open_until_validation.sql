DO $migration$
DECLARE definition text; original text; closing_line text := 'UPDATE public.species_reports SET status=''resolved'' WHERE id=ANY(p_report_ids);'; conflict_line text := 'UPDATE public.species_reports z SET status=''dismissed'' WHERE lower(z.species_name)=lower(a.name) AND z.status=''pending'' AND EXISTS(SELECT 1 FROM public.species_reports t WHERE t.user_id=z.user_id AND lower(t.species_name)=lower(n) AND t.id<>z.id AND t.status=''pending'');';
BEGIN
 SELECT pg_get_functiondef('public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid)'::regprocedure) INTO original;
 IF position(closing_line IN original)=0 OR position(conflict_line IN original)=0 THEN RAISE EXCEPTION 'Unexpected report action definition'; END IF;
 definition := replace(original, closing_line, '-- Keep the acting reports pending until explicit validation.');
 definition := replace(definition, conflict_line, 'UPDATE public.species_reports z SET status=''dismissed'' WHERE n<>a.name AND lower(z.species_name)=lower(n) AND z.status=''pending'' AND NOT (z.id=ANY(p_report_ids)) AND EXISTS(SELECT 1 FROM public.species_reports t WHERE t.user_id=z.user_id AND lower(t.species_name)=lower(a.name) AND t.status=''pending'');');
 EXECUTE definition;
END $migration$;
COMMENT ON FUNCTION public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid) IS 'Admin-only transactional global corrections preserving photos; acting reports remain pending until explicit validation. Conflicting duplicate target reports are dismissed during a merge.';