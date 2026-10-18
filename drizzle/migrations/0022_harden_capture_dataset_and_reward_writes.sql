CREATE OR REPLACE FUNCTION public.sync_capture_rarity_from_animal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rarity text;
BEGIN
  SELECT a.rarity INTO v_rarity FROM public.animals a
  WHERE lower(btrim(a.name)) = lower(btrim(NEW.animal_name)) LIMIT 1;
  IF v_rarity IS NOT NULL THEN
    NEW.rarity := v_rarity;
  ELSIF current_setting('role', true) IN ('anon', 'authenticated') AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.rarity := 'common';
  END IF;
  RETURN NEW;
END;
$$;
DROP POLICY IF EXISTS "Users insert their own dataset events" ON public.ml_dataset_events;
CREATE POLICY "Users insert their own dataset events" ON public.ml_dataset_events FOR INSERT TO authenticated WITH CHECK (
 auth.uid() = user_id AND is_ground_truth = false AND forced_name = false
 AND moderator_id IS NULL AND decision_reason IS NULL AND source = 'client'
 AND event_type IN ('ai_prediction','user_accepted','user_correction','user_dispute')
 AND (capture_id IS NULL OR EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id AND c.user_id = auth.uid()))
);
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM anon, authenticated;
GRANT ALL ON public.user_badges TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.daily_quests FROM anon, authenticated;
GRANT ALL ON public.daily_quests TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name, username, avatar_url, marketing_emails, is_private, last_login_at, notify_email_likes, notify_email_comments, notify_email_follows, notify_push_likes, notify_push_comments, notify_push_follows, default_share_captures, locale) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE OR REPLACE FUNCTION public.claim_quest_reward(p_quest_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_xp integer;
BEGIN
  UPDATE public.daily_quests d SET claimed = true FROM public.quest_templates t
  WHERE d.id = p_quest_id AND d.template_id = t.id AND d.user_id = auth.uid()
    AND d.completed = true AND d.claimed = false
  RETURNING t.xp_reward INTO v_xp;
  IF v_xp IS NULL THEN RETURN false; END IF;
  PERFORM public.grant_xp(auth.uid(), v_xp);
  RETURN true;
END;
$$;
CREATE OR REPLACE FUNCTION public.get_public_recent_captures(p_limit integer DEFAULT 12)
RETURNS TABLE(animal_name text, created_at timestamptz, rarity text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT c.animal_name, c.created_at, c.rarity FROM public.captures c
 WHERE c.status = 'approved' AND c.shared = true AND NOT public.is_profile_private(c.user_id)
 AND c.animal_name IS NOT NULL AND c.animal_name <> ''
 ORDER BY c.created_at DESC LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;