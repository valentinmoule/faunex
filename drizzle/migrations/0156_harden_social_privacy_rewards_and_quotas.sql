-- Premium: keep arbitrary-user subscription lookups internal to trusted functions.
REVOKE ALL ON FUNCTION public.is_premium(uuid), public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid), public.has_active_subscription(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.my_premium_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_premium_access() TO authenticated, service_role;

-- Private captures and profile activity remain visible to their owner, staff,
-- and followers whose request was actually accepted.
CREATE OR REPLACE FUNCTION public.capture_milestones(capture_ids uuid[])
RETURNS TABLE(capture_id uuid, capture_rank integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH targets AS (
    SELECT c.id, c.user_id
    FROM public.captures c
    WHERE c.id = ANY(capture_ids)
      AND c.status = 'approved'
      AND (
        c.user_id = auth.uid()
        OR public.is_staff(auth.uid())
        OR (
          c.shared = true
          AND (
            NOT public.is_profile_private(c.user_id)
            OR EXISTS (
              SELECT 1 FROM public.explorer_follows f
              WHERE f.follower_id = auth.uid()
                AND f.following_id = c.user_id
                AND f.status = 'accepted'
            )
          )
        )
      )
  ), ranked AS (
    SELECT c.id,
           ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.created_at ASC, c.id ASC)::int AS rn
    FROM public.captures c
    WHERE c.status = 'approved'
      AND c.user_id IN (SELECT user_id FROM targets)
  )
  SELECT r.id, r.rn FROM ranked r WHERE r.id IN (SELECT id FROM targets);
$$;
REVOKE ALL ON FUNCTION public.capture_milestones(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capture_milestones(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.category_leaderboard(p_category text, p_limit integer DEFAULT 20, p_scope text DEFAULT 'global', p_period text DEFAULT 'week')
RETURNS TABLE(rank bigint, user_id uuid, display_name text, username text, avatar_url text, captures bigint, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT coalesce(p_scope, 'global') = 'follows' AS follows_only,
           coalesce(p_period, 'week') = 'all' AS all_time,
           public.is_staff(auth.uid()) AS staff
  ), bounds AS (
    SELECT ((now() AT TIME ZONE 'Europe/Paris')::date
            - (extract(dow FROM (now() AT TIME ZONE 'Europe/Paris')::date))::int)::timestamp AT TIME ZONE 'Europe/Paris' AS week_start
  ), allowed AS (
    SELECT auth.uid() AS uid
    UNION
    SELECT f.following_id FROM public.explorer_follows f
    WHERE f.follower_id = auth.uid() AND f.status = 'accepted'
  ), hidden AS (
    SELECT p.user_id FROM public.profiles p, me m
    WHERE p.is_private = true AND NOT m.staff
      AND p.user_id NOT IN (SELECT uid FROM allowed WHERE uid IS NOT NULL)
  ), premium AS (
    SELECT public.is_premium(auth.uid()) AS ok
  ), base AS (
    SELECT c.user_id, count(*) AS cnt
    FROM public.captures c, bounds b, me m
    WHERE c.status = 'approved'
      AND (m.all_time OR (c.created_at >= b.week_start AND c.created_at < b.week_start + interval '7 days'))
      AND (
        p_category IS NULL OR p_category IN ('all', '*')
        OR lower(btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i'))) = lower(btrim(p_category))
      )
      AND c.user_id <> ALL (ARRAY['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc','c62717cb-255a-4491-a5a0-132880e703be']::uuid[])
      AND c.user_id NOT IN (SELECT h.user_id FROM hidden h)
      AND (NOT m.follows_only OR ((SELECT ok FROM premium) AND c.user_id IN (SELECT uid FROM allowed)))
    GROUP BY c.user_id
  ), ranked AS (
    SELECT b.user_id, b.cnt, rank() OVER (ORDER BY b.cnt DESC) AS rnk FROM base b
  )
  SELECT r.rnk, r.user_id, p.display_name, p.username, p.avatar_url, r.cnt, r.user_id = auth.uid()
  FROM ranked r
  JOIN public.profiles p ON p.user_id = r.user_id
  ORDER BY r.rnk, coalesce(p.display_name, p.username, '')
  LIMIT greatest(coalesce(p_limit, 20), 1);
$$;

CREATE OR REPLACE FUNCTION public.my_category_rank(p_category text, p_scope text DEFAULT 'global', p_period text DEFAULT 'week')
RETURNS TABLE(rank bigint, captures bigint, total_players bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT coalesce(p_scope, 'global') = 'follows' AS follows_only,
           coalesce(p_period, 'week') = 'all' AS all_time,
           public.is_staff(auth.uid()) AS staff
  ), bounds AS (
    SELECT ((now() AT TIME ZONE 'Europe/Paris')::date
            - (extract(dow FROM (now() AT TIME ZONE 'Europe/Paris')::date))::int)::timestamp AT TIME ZONE 'Europe/Paris' AS week_start
  ), allowed AS (
    SELECT auth.uid() AS uid
    UNION
    SELECT f.following_id FROM public.explorer_follows f
    WHERE f.follower_id = auth.uid() AND f.status = 'accepted'
  ), hidden AS (
    SELECT p.user_id FROM public.profiles p, me m
    WHERE p.is_private = true AND NOT m.staff
      AND p.user_id NOT IN (SELECT uid FROM allowed WHERE uid IS NOT NULL)
  ), premium AS (
    SELECT public.is_premium(auth.uid()) AS ok
  ), base AS (
    SELECT c.user_id, count(*) AS cnt
    FROM public.captures c, bounds b, me m
    WHERE c.status = 'approved'
      AND (m.all_time OR (c.created_at >= b.week_start AND c.created_at < b.week_start + interval '7 days'))
      AND (
        p_category IS NULL OR p_category IN ('all', '*')
        OR lower(btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i'))) = lower(btrim(p_category))
      )
      AND c.user_id <> ALL (ARRAY['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc','c62717cb-255a-4491-a5a0-132880e703be']::uuid[])
      AND c.user_id NOT IN (SELECT h.user_id FROM hidden h)
      AND (NOT m.follows_only OR ((SELECT ok FROM premium) AND c.user_id IN (SELECT uid FROM allowed)))
    GROUP BY c.user_id
  ), ranked AS (
    SELECT b.user_id, b.cnt, rank() OVER (ORDER BY b.cnt DESC) AS rnk FROM base b
  )
  SELECT r.rnk, r.cnt, (SELECT count(*) FROM ranked)
  FROM ranked r WHERE r.user_id = auth.uid();
$$;

-- A private target must approve the follow before it grants capture access.
DROP POLICY IF EXISTS "Users can insert own follows" ON public.explorer_follows;
CREATE POLICY "Users can insert own follows" ON public.explorer_follows
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = follower_id
  AND (
    status = 'pending'
    OR (status = 'accepted' AND NOT public.is_profile_private(following_id))
  )
);
DROP POLICY IF EXISTS "Target can update follow status" ON public.explorer_follows;
CREATE POLICY "Target can update follow status" ON public.explorer_follows
FOR UPDATE TO authenticated
USING (following_id = auth.uid())
WITH CHECK (following_id = auth.uid() AND status IN ('pending', 'accepted', 'declined'));

-- Permanent, service-only reward receipts make social XP idempotent even when
-- rows are deleted and recreated. Existing pairs are backfilled; past XP is kept.
CREATE TABLE public.social_reward_grants (
  reward_key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_reward_grants TO service_role;
ALTER TABLE public.social_reward_grants ENABLE ROW LEVEL SECURITY;

INSERT INTO public.social_reward_grants(reward_key)
SELECT 'follow:' || least(follower_id::text, following_id::text) || ':' || greatest(follower_id::text, following_id::text)
FROM public.explorer_follows
ON CONFLICT DO NOTHING;
INSERT INTO public.social_reward_grants(reward_key)
SELECT 'friend:' || least(requester_id::text, addressee_id::text) || ':' || greatest(requester_id::text, addressee_id::text)
FROM public.explorer_friends
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.xp_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_key text;
BEGIN
  IF NEW.status <> 'accepted' THEN RETURN NEW; END IF;
  INSERT INTO public.social_reward_grants(reward_key)
  VALUES ('follow:' || least(NEW.follower_id::text, NEW.following_id::text) || ':' || greatest(NEW.follower_id::text, NEW.following_id::text))
  ON CONFLICT DO NOTHING RETURNING reward_key INTO v_key;
  IF v_key IS NOT NULL THEN
    PERFORM public.grant_xp(NEW.follower_id, 10);
    PERFORM public.grant_xp(NEW.following_id, 10);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_follow_xp ON public.explorer_follows;
CREATE TRIGGER on_follow_xp AFTER INSERT OR UPDATE OF status ON public.explorer_follows
FOR EACH ROW EXECUTE FUNCTION public.xp_on_follow();

CREATE OR REPLACE FUNCTION public.xp_on_friend_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_key text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO public.social_reward_grants(reward_key)
    VALUES ('friend:' || least(NEW.requester_id::text, NEW.addressee_id::text) || ':' || greatest(NEW.requester_id::text, NEW.addressee_id::text))
    ON CONFLICT DO NOTHING RETURNING reward_key INTO v_key;
    IF v_key IS NOT NULL THEN
      PERFORM public.grant_xp(NEW.requester_id, 20);
      PERFORM public.grant_xp(NEW.addressee_id, 20);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Client-approved captures need an unused, matching AI proof. Staff and the
-- trusted moderation/confirmation services keep their existing approval paths.
CREATE OR REPLACE FUNCTION public.xp_on_capture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_xp integer; v_proof uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.xp_awarded := false; ELSE NEW.xp_awarded := OLD.xp_awarded; END IF;
  IF NEW.status <> 'approved' OR NEW.xp_awarded THEN RETURN NEW; END IF;
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.is_staff(auth.uid()) THEN
    SELECT v.id INTO v_proof FROM public.capture_validations v
    WHERE v.id = NEW.economy_validation_id
      AND v.user_id = NEW.user_id
      AND v.source = 'ai'
      AND v.revoked_at IS NULL
      AND v.consumed_at IS NULL
      AND v.expires_at > now()
      AND (v.capture_id IS NULL OR v.capture_id = NEW.id)
      AND lower(btrim(v.animal_name)) = lower(btrim(NEW.animal_name))
      AND lower(btrim(coalesce(v.scientific_name, ''))) = lower(btrim(coalesce(NEW.scientific_name, '')))
    FOR UPDATE;
    IF v_proof IS NULL THEN
      NEW.xp_awarded := false;
      RETURN NEW;
    END IF;
    UPDATE public.capture_validations SET capture_id = NEW.id
    WHERE id = v_proof AND capture_id IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.captures c
    WHERE c.user_id = NEW.user_id AND c.id <> NEW.id AND c.status = 'approved'
      AND lower(btrim(c.animal_name)) = lower(btrim(NEW.animal_name))
  ) THEN
    v_xp := 15;
  ELSE
    v_xp := CASE lower(coalesce(NEW.rarity, 'common'))
      WHEN 'uncommon' THEN 75 WHEN 'rare' THEN 120 WHEN 'very_rare' THEN 160
      WHEN 'ultra_rare' THEN 220 WHEN 'illustration_rare' THEN 300
      WHEN 'special_rare' THEN 400 WHEN 'hyper_rare' THEN 550
      WHEN 'epic' THEN 220 WHEN 'legendary' THEN 400 WHEN 'mythic' THEN 550 ELSE 50 END;
  END IF;
  NEW.xp_awarded := true;
  PERFORM public.grant_xp(NEW.user_id, v_xp);
  RETURN NEW;
END;
$$;

-- The existing free plan allows four slots across both kinds of saved area.
CREATE OR REPLACE FUNCTION public.enforce_free_bestiary_slot_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR public.is_premium(NEW.user_id) THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('bestiary-slot:' || NEW.user_id::text, 0));
  SELECT (SELECT count(*) FROM public.user_department_subscriptions WHERE user_id = NEW.user_id)
       + (SELECT count(*) FROM public.user_species_collections WHERE user_id = NEW.user_id)
  INTO v_count;
  IF v_count >= 4 THEN RAISE EXCEPTION 'free_slot_limit'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_free_bestiary_slot_limit ON public.user_department_subscriptions;
CREATE TRIGGER trg_free_bestiary_slot_limit BEFORE INSERT ON public.user_department_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_bestiary_slot_limit();
DROP TRIGGER IF EXISTS trg_free_bestiary_slot_limit ON public.user_species_collections;
CREATE TRIGGER trg_free_bestiary_slot_limit BEFORE INSERT ON public.user_species_collections
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_bestiary_slot_limit();

-- Custom collections remain usable by active Premium members. Public pins stay
-- public; expired owners can still delete their own data.
DROP POLICY IF EXISTS "Users manage their own custom collections" ON public.custom_collections;
CREATE POLICY "Premium owners read custom collections" ON public.custom_collections
FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.my_premium_access());
CREATE POLICY "Premium owners insert custom collections" ON public.custom_collections
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.my_premium_access());
CREATE POLICY "Premium owners update custom collections" ON public.custom_collections
FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.my_premium_access())
WITH CHECK (user_id = auth.uid() AND public.my_premium_access());
CREATE POLICY "Owners delete custom collections" ON public.custom_collections
FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage their own custom collection items" ON public.custom_collection_items;
CREATE POLICY "Premium owners read custom collection items" ON public.custom_collection_items
FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.my_premium_access());
CREATE POLICY "Premium owners insert custom collection items" ON public.custom_collection_items
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND public.my_premium_access()
  AND EXISTS (SELECT 1 FROM public.custom_collections c WHERE c.id = collection_id AND c.user_id = auth.uid())
);
CREATE POLICY "Premium owners update custom collection items" ON public.custom_collection_items
FOR UPDATE TO authenticated USING (
  user_id = auth.uid() AND public.my_premium_access()
  AND EXISTS (SELECT 1 FROM public.custom_collections c WHERE c.id = collection_id AND c.user_id = auth.uid())
) WITH CHECK (
  user_id = auth.uid() AND public.my_premium_access()
  AND EXISTS (SELECT 1 FROM public.custom_collections c WHERE c.id = collection_id AND c.user_id = auth.uid())
);
CREATE POLICY "Owners delete custom collection items" ON public.custom_collection_items
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Browser push destinations are restricted to the actual browser providers.
CREATE OR REPLACE FUNCTION public.is_valid_web_push_endpoint(p_endpoint text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT p_endpoint ~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)+notify\.windows\.com|web\.push\.apple\.com)/[^[:space:]]*$';
$$;
REVOKE ALL ON FUNCTION public.is_valid_web_push_endpoint(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_web_push_endpoint(text) TO authenticated, service_role;
DROP POLICY IF EXISTS "Users manage own push subs" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions
FOR ALL TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND public.is_valid_web_push_endpoint(endpoint));

-- Native tokens are private and registration cannot transfer another device.
REVOKE ALL ON public.native_push_devices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.native_push_devices TO service_role;
CREATE OR REPLACE FUNCTION public.register_native_push_device(p_user uuid, p_token text, p_platform text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows integer;
BEGIN
  IF p_user IS NULL OR length(p_token) < 20 OR length(p_token) > 4096 OR p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'invalid_device';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('native-push:' || p_token, 0));
  INSERT INTO public.native_push_devices(user_id, token, platform, updated_at)
  VALUES (p_user, p_token, p_platform, now())
  ON CONFLICT (token) DO UPDATE SET platform = excluded.platform, updated_at = now()
  WHERE public.native_push_devices.user_id = p_user;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'token_registered_elsewhere'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.register_native_push_device(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_native_push_device(uuid, text, text) TO service_role;

-- Family invitations still support people without an account, with tighter
-- per-family and per-recipient anti-spam limits.
CREATE OR REPLACE FUNCTION public.create_family_email_invitation(p_user uuid, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE f public.families; token text; invitation uuid; v_email text := lower(trim(p_email));
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF v_email IS NULL OR length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('family-invite:' || p_user::text, 0));
  SELECT * INTO f FROM public.families WHERE owner_id = p_user AND closed_at IS NULL
    AND id IN (SELECT family_id FROM public.family_memberships WHERE user_id = p_user AND left_at IS NULL) FOR UPDATE;
  IF f.id IS NULL THEN RAISE EXCEPTION 'owner_required'; END IF;
  IF NOT public.family_valid(f.id) THEN RAISE EXCEPTION 'family_expired'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users u JOIN public.family_memberships m ON m.user_id = u.id
    WHERE lower(u.email) = v_email AND m.family_id = f.id AND m.left_at IS NULL) THEN RAISE EXCEPTION 'already_in_family'; END IF;
  UPDATE public.family_invitations SET revoked_at = now()
  WHERE family_id = f.id AND recipient_email = v_email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at <= now();
  IF EXISTS(SELECT 1 FROM public.family_invitations WHERE family_id = f.id AND recipient_email = v_email
    AND revoked_at IS NULL AND accepted_at IS NULL) THEN RAISE EXCEPTION 'invitation_pending'; END IF;
  IF (SELECT count(*) FROM public.family_invitations WHERE family_id = f.id AND created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'invite_rate_limit';
  END IF;
  IF EXISTS(SELECT 1 FROM public.family_invitations WHERE recipient_email = v_email AND created_at > now() - interval '24 hours') THEN
    RAISE EXCEPTION 'recipient_rate_limit';
  END IF;
  IF (SELECT count(*) FROM public.family_memberships WHERE family_id = f.id AND left_at IS NULL)
    + (SELECT count(*) FROM public.family_invitations WHERE family_id = f.id AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > now()) >= 4 THEN
    RAISE EXCEPTION 'family_full';
  END IF;
  token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.family_invitations(family_id, token_hash, recipient_email)
  VALUES(f.id, encode(digest(token, 'sha256'), 'hex'), v_email) RETURNING id INTO invitation;
  RETURN jsonb_build_object('id', invitation, 'token', token, 'email', v_email);
END;
$$;
