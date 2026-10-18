ALTER TABLE public.nearby_search_attempts ADD COLUMN IF NOT EXISTS consumed_at timestamptz;
CREATE OR REPLACE FUNCTION public.claim_nearby_search(p_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_count integer;
BEGIN
  IF p_user IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('nearby:' || p_user::text, 0));
  SELECT id INTO v_id FROM public.nearby_search_attempts WHERE user_id = p_user
    AND consumed_at IS NULL AND created_at >= now() - interval '2 minutes'
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_id IS NOT NULL THEN
    UPDATE public.nearby_search_attempts SET consumed_at = now() WHERE id = v_id;
    RETURN true;
  END IF;
  SELECT count(*) INTO v_count FROM public.nearby_search_attempts WHERE user_id = p_user
    AND created_at >= date_trunc('day', now()) AND created_at < date_trunc('day', now()) + interval '1 day';
  IF NOT public.is_premium(p_user) AND v_count >= 4 THEN RETURN false; END IF;
  INSERT INTO public.nearby_search_attempts(user_id, consumed_at) VALUES (p_user, now());
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_nearby_search(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_nearby_search(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.record_nearby_search()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('nearby:' || v_user::text, 0));
  IF public.is_premium(v_user) THEN
    INSERT INTO public.nearby_search_attempts(user_id) VALUES (v_user); RETURN 999;
  END IF;
  SELECT count(*) INTO v_count FROM public.nearby_search_attempts WHERE user_id = v_user
    AND created_at >= date_trunc('day', now()) AND created_at < date_trunc('day', now()) + interval '1 day';
  IF v_count >= 4 THEN RAISE EXCEPTION 'DAILY_NEARBY_LIMIT_REACHED'; END IF;
  INSERT INTO public.nearby_search_attempts(user_id) VALUES (v_user);
  RETURN greatest(0, 4 - (v_count + 1));
END;
$$;
DROP POLICY IF EXISTS "Users can view all comments" ON public.feed_comments;
CREATE POLICY "Users can view all comments" ON public.feed_comments FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id)
);
DROP POLICY IF EXISTS "Users can view all likes" ON public.feed_likes;
CREATE POLICY "Users can view all likes" ON public.feed_likes FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id)
);
DROP POLICY IF EXISTS "Users can insert own comments" ON public.feed_comments;
CREATE POLICY "Users can insert own comments" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (
 auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id)
);
DROP POLICY IF EXISTS "Users can insert own likes" ON public.feed_likes;
CREATE POLICY "Users can insert own likes" ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (
 auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.captures c WHERE c.id = capture_id)
);