CREATE OR REPLACE FUNCTION public.admin_reported_species_action(p_report_ids uuid[], p_animal_id uuid, p_expected_name text, p_expected_scientific text, p_action text, p_value text DEFAULT NULL, p_target_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  r := public.admin_reported_species_action_impl(p_report_ids, p_animal_id, p_expected_name, p_expected_scientific, p_action, p_value, p_target_id);
  IF auth.uid() IS NOT NULL AND p_action IN ('vernacular','scientific','merge','delete') THEN
    INSERT INTO public.moderator_actions (moderator_id, action, species_name)
    VALUES (auth.uid(), CASE WHEN p_action IN ('vernacular','scientific') THEN 'rename' ELSE p_action END, p_expected_name);
  END IF;
  RETURN r;
END $function$;
REVOKE ALL ON FUNCTION public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reported_species_action(uuid[],uuid,text,text,text,text,uuid) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';