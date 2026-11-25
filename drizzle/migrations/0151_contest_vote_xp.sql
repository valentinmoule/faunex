CREATE OR REPLACE FUNCTION public.cast_contest_vote(p_entry_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); e public.photo_contest_entries%ROWTYPE;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO e FROM public.photo_contest_entries WHERE id = p_entry_id;
  IF NOT FOUND OR e.week_start <> public.contest_week() - 7 THEN RAISE EXCEPTION 'voting_closed'; END IF;
  IF e.user_id = u THEN RAISE EXCEPTION 'own_photo'; END IF;
  INSERT INTO public.photo_contest_votes(voter_id, entry_id, week_start) VALUES (u, p_entry_id, e.week_start)
  ON CONFLICT (voter_id, week_start) DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'already_voted'; END IF;
  PERFORM public.grant_xp(u, 5);
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.cast_contest_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_contest_vote(uuid) TO authenticated;