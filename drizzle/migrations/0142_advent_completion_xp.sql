CREATE TABLE public.advent_completion_rewards (
  user_id uuid NOT NULL,
  collection_id uuid NOT NULL,
  xp integer NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collection_id)
);
GRANT SELECT ON public.advent_completion_rewards TO authenticated;
GRANT ALL ON public.advent_completion_rewards TO service_role;
ALTER TABLE public.advent_completion_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own advent rewards" ON public.advent_completion_rewards FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.advent_grant_completion_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NEW.approved_at IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('advent_reward:' || NEW.user_id::text || NEW.collection_id::text));
  SELECT count(DISTINCT day) INTO n FROM public.advent_submissions
   WHERE user_id = NEW.user_id AND collection_id = NEW.collection_id AND approved_at IS NOT NULL;
  IF n >= 24 THEN
    INSERT INTO public.advent_completion_rewards(user_id, collection_id, xp)
    VALUES (NEW.user_id, NEW.collection_id, 400) ON CONFLICT DO NOTHING;
    IF FOUND THEN PERFORM public.grant_xp(NEW.user_id, 400); END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.advent_grant_completion_xp() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER advent_completion_xp
AFTER INSERT OR UPDATE OF approved_at ON public.advent_submissions
FOR EACH ROW EXECUTE FUNCTION public.advent_grant_completion_xp();