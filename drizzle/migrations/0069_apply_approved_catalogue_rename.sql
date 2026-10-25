CREATE OR REPLACE FUNCTION public.apply_approved_catalogue_rename(p_batch text,p_old text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE r jsonb; a public.animals%ROWTYPE; n text; s text;
BEGIN
SELECT row_data INTO r FROM public.catalogue_update_snapshots WHERE batch_key=p_batch AND relation_name='approved_mapping' AND row_key=p_old;
IF r IS NULL THEN RAISE EXCEPTION 'Unapproved catalogue mapping'; END IF;
n:=r->>'new'; s:=r->>'sci';
SELECT * INTO a FROM public.animals WHERE name=p_old AND scientific_name=s FOR UPDATE;
IF a.id IS NULL THEN RETURN 'already applied or absent'; END IF;
IF EXISTS(SELECT 1 FROM public.animals WHERE lower(name)=lower(n) AND id<>a.id) THEN RAISE EXCEPTION 'Target name occupied: %',n; END IF;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'animals',a.id::text,to_jsonb(a),now() ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'captures',c.id::text,to_jsonb(c),now() FROM public.captures c WHERE c.animal_name=p_old ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'taxa',t.id::text,to_jsonb(t),now() FROM public.taxa t WHERE t.id=a.taxon_id OR (t.vernacular_name=p_old AND t.scientific_name=s) ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'species_profiles',sp.id::text,to_jsonb(sp),now() FROM public.species_profiles sp WHERE sp.animal_name IN (p_old,n) ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'animal_merge_map',m.old_name,to_jsonb(m),now() FROM public.animal_merge_map m WHERE m.old_name=n OR m.new_name=p_old OR m.old_name=p_old ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'custom_collection_items',c.id::text,to_jsonb(c),now() FROM public.custom_collection_items c WHERE c.animal_name=p_old ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'animal_departments',d.department_code||':'||d.animal_name,to_jsonb(d),now() FROM public.animal_departments d WHERE d.animal_name=p_old ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'themed_collections',t.id::text,to_jsonb(t),now() FROM public.themed_collections t WHERE p_old=ANY(t.species_names) ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'species_pages',sp.slug,to_jsonb(sp),now() FROM public.species_pages sp WHERE sp.animal_name=p_old ON CONFLICT DO NOTHING;
INSERT INTO public.catalogue_update_snapshots SELECT p_batch,'species_reports',sp.id::text,to_jsonb(sp),now() FROM public.species_reports sp WHERE sp.species_name=p_old ON CONFLICT DO NOTHING;
DELETE FROM public.animal_merge_map WHERE old_name=n;
UPDATE public.taxa SET vernacular_name=n,updated_at=now() WHERE id=a.taxon_id OR (vernacular_name=p_old AND scientific_name=s);
UPDATE public.animals SET name=n WHERE id=a.id;
-- Descriptions are the same species; retain their prose to avoid expensive revalidation and invalidate EN only if source changed.
-- Remove a conflicting destination profile from a different scientific identity, after snapshotting it.
DELETE FROM public.species_profiles WHERE animal_name=n AND scientific_name IS DISTINCT FROM s;
DELETE FROM public.species_profiles sp WHERE sp.animal_name=p_old AND sp.scientific_name=s AND EXISTS(SELECT 1 FROM public.species_profiles t WHERE t.normalized_name=public.normalize_animal_label(n) AND t.id<>sp.id);
UPDATE public.species_profiles SET animal_name=n,normalized_name=public.normalize_animal_label(n) WHERE animal_name=p_old AND scientific_name=s;
UPDATE public.captures SET animal_name=n WHERE animal_name=p_old AND scientific_name=s;
UPDATE public.custom_collection_items SET animal_name=n WHERE animal_name=p_old AND scientific_name=s;
INSERT INTO public.animal_departments(animal_name,department_code,created_at,taxon_id) SELECT n,department_code,created_at,taxon_id FROM public.animal_departments WHERE animal_name=p_old ON CONFLICT DO NOTHING;
DELETE FROM public.animal_departments WHERE animal_name=p_old;
UPDATE public.themed_collections SET species_names=array_replace(species_names,p_old,n) WHERE p_old=ANY(species_names);
UPDATE public.species_pages SET animal_name=n,updated_at=now() WHERE animal_name=p_old AND scientific_name=s;
UPDATE public.species_reports SET species_name=n WHERE species_name=p_old;
UPDATE public.animal_merge_map SET new_name=n WHERE new_name=p_old AND old_name<>n;
INSERT INTO public.animal_merge_map(old_name,new_name,mode) VALUES(p_old,n,'rename') ON CONFLICT(old_name) DO UPDATE SET new_name=excluded.new_name;
RETURN n;
END $fn$;
REVOKE ALL ON FUNCTION public.apply_approved_catalogue_rename(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_approved_catalogue_rename(text,text) TO service_role;
COMMENT ON FUNCTION public.apply_approved_catalogue_rename(text,text) IS 'Service-only exact scientific identity-preserving renames, authorized by a preapproved mapping with private before-images.';