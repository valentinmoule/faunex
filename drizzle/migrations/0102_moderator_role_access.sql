CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'))
$$;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

ALTER POLICY "Admins can view all captures" ON public.captures USING (public.is_staff(auth.uid()));
ALTER POLICY "Admins can moderate captures" ON public.captures USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER POLICY "Admins can delete captures" ON public.captures USING (public.is_staff(auth.uid()));
ALTER POLICY "Admins can send notifications" ON public.notifications WITH CHECK (public.is_staff(auth.uid()));
ALTER POLICY "Admins read reports" ON public.species_reports USING (public.is_staff(auth.uid()));
ALTER POLICY "Admins update reports" ON public.species_reports USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER POLICY "Admins manage taxa" ON public.taxa USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER POLICY "Admins manage synonyms" ON public.taxon_synonyms USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER POLICY "Admins can read merge map" ON public.animal_merge_map USING (public.is_staff(auth.uid()));
ALTER POLICY "Admins can view background jobs" ON public.background_jobs USING (public.is_staff(auth.uid()));

DO $$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['admin_reported_species_action','guard_capture_correction','sync_capture_rarity_from_animal'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=f;
    d := replace(d, 'public.has_role(auth.uid(),''admin'')', 'public.is_staff(auth.uid())');
    d := replace(d, 'public.has_role(auth.uid(), ''admin'')', 'public.is_staff(auth.uid())');
    EXECUTE d;
  END LOOP;
END $$;