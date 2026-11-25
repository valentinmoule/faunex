DROP TRIGGER IF EXISTS advent_completion_xp ON public.advent_submissions;

CREATE OR REPLACE FUNCTION public.claim_advent_completion(p_collection_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('advent_reward:' || uid::text || p_collection_id::text));
  SELECT count(DISTINCT day) INTO n FROM public.advent_submissions
   WHERE user_id = uid AND collection_id = p_collection_id AND approved_at IS NOT NULL;
  IF n < 24 THEN RETURN 0; END IF;
  INSERT INTO public.advent_completion_rewards(user_id, collection_id, xp)
  VALUES (uid, p_collection_id, 400) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  PERFORM public.grant_xp(uid, 400);
  RETURN 400;
END $$;
REVOKE ALL ON FUNCTION public.claim_advent_completion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_advent_completion(uuid) TO authenticated;