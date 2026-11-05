CREATE TABLE public.moderator_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL,
  action text NOT NULL,
  species_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderator_actions TO authenticated;
GRANT ALL ON public.moderator_actions TO service_role;
ALTER TABLE public.moderator_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read moderator actions" ON public.moderator_actions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX moderator_actions_mod_idx ON public.moderator_actions (moderator_id, created_at);

ALTER FUNCTION public.admin_reported_species_action(uuid[], uuid, text, text, text, text, uuid) RENAME TO admin_reported_species_action_impl;
ALTER FUNCTION public.admin_delete_bestiary_species(text, text) RENAME TO admin_delete_bestiary_species_impl;
REVOKE EXECUTE ON FUNCTION public.admin_reported_species_action_impl(uuid[], uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_bestiary_species_impl(text, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.admin_reported_species_action(p_report_ids uuid[], p_animal_id uuid, p_expected_name text, p_expected_scientific text, p_action text, p_value text, p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  r := public.admin_reported_species_action_impl(p_report_ids, p_animal_id, p_expected_name, p_expected_scientific, p_action, p_value, p_target_id);
  IF auth.uid() IS NOT NULL AND p_action IN ('vernacular','scientific','merge','delete') THEN
    INSERT INTO public.moderator_actions (moderator_id, action, species_name)
    VALUES (auth.uid(), CASE WHEN p_action IN ('vernacular','scientific') THEN 'rename' ELSE p_action END, p_expected_name);
  END IF;
  RETURN r;
END $$;

CREATE FUNCTION public.admin_delete_bestiary_species(p_name text, p_scientific text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r boolean;
BEGIN
  r := public.admin_delete_bestiary_species_impl(p_name, p_scientific);
  IF r AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.moderator_actions (moderator_id, action, species_name) VALUES (auth.uid(), 'delete', p_name);
  END IF;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_reported_species_action(uuid[], uuid, text, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_bestiary_species(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reported_species_action(uuid[], uuid, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_bestiary_species(text, text) TO authenticated;

CREATE FUNCTION public.admin_moderator_stats(_start timestamptz, _end timestamptz)
RETURNS TABLE(moderator_id uuid, name text, approved bigint, renamed bigint, merged bigint, deleted bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH staff AS (SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('admin','moderator')),
  ap AS (SELECT e.moderator_id m, count(*) c FROM public.ml_dataset_events e
         WHERE e.event_type='moderation_approved' AND e.moderator_id IS NOT NULL AND e.created_at >= _start AND e.created_at < _end GROUP BY 1),
  ac AS (SELECT a.moderator_id m,
           count(*) FILTER (WHERE a.action='rename') rn,
           count(*) FILTER (WHERE a.action='merge') mg,
           count(*) FILTER (WHERE a.action='delete') dl
         FROM public.moderator_actions a WHERE a.created_at >= _start AND a.created_at < _end GROUP BY 1)
  SELECT s.user_id, coalesce(nullif(p.display_name,''), p.username, 'Explorateur')::text,
         coalesce(ap.c,0), coalesce(ac.rn,0), coalesce(ac.mg,0), coalesce(ac.dl,0)
  FROM staff s LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN ap ON ap.m = s.user_id LEFT JOIN ac ON ac.m = s.user_id
  ORDER BY 3 DESC, 4+5+6 DESC;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_moderator_stats(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderator_stats(timestamptz, timestamptz) TO authenticated;