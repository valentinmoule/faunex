CREATE TABLE public.weekly_chest_claims (
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  xp integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
GRANT SELECT ON public.weekly_chest_claims TO authenticated;
GRANT ALL ON public.weekly_chest_claims TO service_role;
ALTER TABLE public.weekly_chest_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own chest claims readable" ON public.weekly_chest_claims FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_weekly_chest(p_week date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_total int; v_open int; v_xp int := 50;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('chest:' || v_uid::text));
  SELECT count(*), count(*) FILTER (WHERE NOT claimed) INTO v_total, v_open
  FROM public.daily_quests WHERE user_id = v_uid AND quest_date = p_week;
  IF v_total = 0 OR v_open > 0 THEN RETURN 0; END IF;
  INSERT INTO public.weekly_chest_claims(user_id, week_start, xp) VALUES (v_uid, p_week, v_xp)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  PERFORM public.grant_xp(v_uid, v_xp);
  RETURN v_xp;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_weekly_chest(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_weekly_chest(date) TO authenticated;