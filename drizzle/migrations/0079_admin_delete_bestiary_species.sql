CREATE OR REPLACE FUNCTION public.admin_delete_bestiary_species(p_name text, p_scientific text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_animal public.animals%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_animal FROM public.animals
  WHERE name = p_name AND coalesce(scientific_name, '') = coalesce(p_scientific, '')
  FOR UPDATE;
  IF v_animal.id IS NULL THEN RETURN false; END IF;
  UPDATE public.species_pages SET published = false WHERE animal_name = v_animal.name;
  DELETE FROM public.animals WHERE id = v_animal.id;
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_delete_bestiary_species(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_bestiary_species(text, text) TO authenticated;
COMMENT ON FUNCTION public.admin_delete_bestiary_species(text, text) IS 'Admin/moderator-only catalogue deletion, exact common/scientific identity; preserves all personal captures and photos.';