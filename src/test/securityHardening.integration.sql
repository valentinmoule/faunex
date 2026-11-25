-- Exécuter avec une connexion privilégiée. Toutes les données de test sont annulées.
BEGIN;
CREATE TEMP TABLE security_ctx ON COMMIT DROP AS
SELECT f.user_id AS follower_id, t.user_id AS target_id, c.id AS capture_id, t.username AS target_username
FROM public.profiles f
JOIN public.profiles t ON t.user_id <> f.user_id AND t.username IS NOT NULL
JOIN public.captures c ON c.user_id = t.user_id AND c.status = 'approved' AND c.shared = true
WHERE NOT public.is_staff(f.user_id)
  AND NOT public.is_staff(t.user_id)
  AND NOT public.is_premium(f.user_id)
  AND f.xp + 10 < f.xp_to_next
  AND t.xp + 10 < t.xp_to_next
  AND (SELECT count(*) FROM public.captures fc WHERE fc.user_id = f.user_id AND fc.created_at >= now() - interval '24 hours') < 3
LIMIT 1;
CREATE TEMP TABLE security_animals ON COMMIT DROP AS
SELECT a.id AS animal_id, row_number() OVER (ORDER BY a.id) AS rn
FROM public.animals a, security_ctx s
WHERE a.rarity = 'common'
  AND NOT EXISTS (SELECT 1 FROM public.captures c WHERE c.user_id = s.follower_id AND lower(btrim(c.animal_name)) = lower(btrim(a.name)))
ORDER BY a.id LIMIT 2;
GRANT SELECT ON pg_temp.security_ctx, pg_temp.security_animals TO authenticated;
DO $$
BEGIN
  IF (SELECT follower_id IS NULL OR target_id IS NULL OR capture_id IS NULL FROM security_ctx)
    OR (SELECT count(*) FROM security_animals) < 2 THEN
    RAISE EXCEPTION 'security_test_accounts_required';
  END IF;
END $$;

-- Prépare les comptes sans conserver aucune modification à la fin.
UPDATE public.profiles SET is_private = true WHERE user_id = (SELECT target_id FROM security_ctx);
DELETE FROM public.explorer_follows WHERE (follower_id, following_id) IN (SELECT follower_id, target_id FROM security_ctx);
DELETE FROM public.social_reward_grants WHERE reward_key = (
  SELECT 'follow:' || least(follower_id::text, target_id::text) || ':' || greatest(follower_id::text, target_id::text) FROM security_ctx
);
DELETE FROM public.user_department_subscriptions WHERE user_id = (SELECT follower_id FROM security_ctx);
DELETE FROM public.user_species_collections WHERE user_id = (SELECT follower_id FROM security_ctx);
CREATE TEMP TABLE security_xp_baseline ON COMMIT DROP AS
SELECT (SELECT xp FROM public.profiles WHERE user_id = follower_id) AS follower_xp,
       (SELECT xp FROM public.profiles WHERE user_id = target_id) AS target_xp
FROM security_ctx;

-- Un abonné ne peut pas s'accepter lui-même sur un profil privé.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', (SELECT follower_id::text FROM security_ctx), true);
DO $$
DECLARE refused boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.explorer_follows(follower_id, following_id, status)
    SELECT follower_id, target_id, 'accepted' FROM security_ctx;
  EXCEPTION WHEN insufficient_privilege THEN refused := true;
  END;
  IF NOT refused THEN RAISE EXCEPTION 'private_follow_self_accepted'; END IF;
  INSERT INTO public.explorer_follows(follower_id, following_id, status)
  SELECT follower_id, target_id, 'pending' FROM security_ctx;
END $$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT xp FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx)) <> (SELECT follower_xp FROM security_xp_baseline)
    OR (SELECT xp FROM public.profiles WHERE user_id = (SELECT target_id FROM security_ctx)) <> (SELECT target_xp FROM security_xp_baseline) THEN
    RAISE EXCEPTION 'pending_follow_awarded_xp';
  END IF;
END $$;

-- Le titulaire accepte : la capture devient visible et les XP ne sont versés qu'une fois.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT target_id::text FROM security_ctx), true);
UPDATE public.explorer_follows SET status = 'accepted'
WHERE follower_id = (SELECT follower_id FROM security_ctx) AND following_id = (SELECT target_id FROM security_ctx);
UPDATE public.explorer_follows SET status = 'pending'
WHERE follower_id = (SELECT follower_id FROM security_ctx) AND following_id = (SELECT target_id FROM security_ctx);
UPDATE public.explorer_follows SET status = 'accepted'
WHERE follower_id = (SELECT follower_id FROM security_ctx) AND following_id = (SELECT target_id FROM security_ctx);
RESET ROLE;
DO $$
BEGIN
  IF (SELECT xp FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx)) <> (SELECT follower_xp + 10 FROM security_xp_baseline)
    OR (SELECT xp FROM public.profiles WHERE user_id = (SELECT target_id FROM security_ctx)) <> (SELECT target_xp + 10 FROM security_xp_baseline) THEN
    RAISE EXCEPTION 'accepted_follow_xp_not_exactly_once';
  END IF;
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT follower_id::text FROM security_ctx), true);
DO $$
DECLARE v_comment uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.captures WHERE id = (SELECT capture_id FROM security_ctx)) THEN
    RAISE EXCEPTION 'accepted_follower_cannot_read_private_capture';
  END IF;
  INSERT INTO public.feed_comments(user_id, capture_id, content)
  SELECT follower_id, capture_id, '@' || ltrim(target_username, '@') || ' belle observation' FROM security_ctx
  RETURNING id INTO v_comment;
  IF v_comment IS NULL THEN RAISE EXCEPTION 'comment_insert_failed'; END IF;
  INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth)
  SELECT follower_id, 'https://fcm.googleapis.com/fcm/send/' || gen_random_uuid(), 'key', 'auth' FROM security_ctx;
END $$;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth)
    SELECT follower_id, 'https://example.com/' || gen_random_uuid(), 'key', 'auth' FROM security_ctx;
    RAISE EXCEPTION 'untrusted_push_endpoint_accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.comment_mention_recipients(
      (SELECT capture_id FROM security_ctx),
      (SELECT follower_id FROM security_ctx),
      '@' || ltrim((SELECT target_username FROM security_ctx), '@') || ' belle observation'
    ) WHERE user_id = (SELECT target_id FROM security_ctx)
  ) THEN RAISE EXCEPTION 'stored_comment_mention_missing'; END IF;
END $$;

-- Le même abonnement sur un profil public reste immédiat.
UPDATE public.profiles SET is_private = false WHERE user_id = (SELECT target_id FROM security_ctx);
DELETE FROM public.explorer_follows WHERE follower_id = (SELECT follower_id FROM security_ctx) AND following_id = (SELECT target_id FROM security_ctx);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT follower_id::text FROM security_ctx), true);
INSERT INTO public.explorer_follows(follower_id, following_id, status)
SELECT follower_id, target_id, 'accepted' FROM security_ctx;

-- Une capture approuvée sans preuve ne rapporte aucun XP ; une preuve IA valide en rapporte 50.
DO $$
DECLARE v_before integer; v_capture uuid := gen_random_uuid(); v_animal public.animals;
BEGIN
  SELECT xp INTO v_before FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx);
  SELECT a.* INTO v_animal FROM public.animals a JOIN security_animals sa ON sa.animal_id = a.id AND sa.rn = 1;
  INSERT INTO public.captures(id, user_id, image_url, animal_name, scientific_name, category, rarity, status, shared, xp_awarded)
  VALUES (v_capture, (SELECT follower_id FROM security_ctx), 'https://faunex.fr/security-no-proof.jpg', v_animal.name, v_animal.scientific_name, v_animal.category, 'hyper_rare', 'approved', true, true);
  IF (SELECT xp_awarded FROM public.captures WHERE id = v_capture)
    OR (SELECT xp FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx)) <> v_before THEN
    RAISE EXCEPTION 'capture_without_proof_awarded_xp';
  END IF;
END $$;
RESET ROLE;
CREATE TEMP TABLE security_proof ON COMMIT DROP AS
SELECT gen_random_uuid() AS id, (SELECT animal_id FROM security_animals WHERE rn = 2) AS animal_id;
GRANT SELECT ON pg_temp.security_proof TO authenticated;
DO $$
DECLARE v_animal public.animals;
BEGIN
  SELECT a.* INTO v_animal FROM public.animals a JOIN security_proof p ON p.animal_id = a.id;
  INSERT INTO public.capture_validations(id, user_id, image_hash, animal_name, scientific_name, source)
  SELECT id, (SELECT follower_id FROM security_ctx), repeat('a', 64), v_animal.name, v_animal.scientific_name, 'ai' FROM security_proof;
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT follower_id::text FROM security_ctx), true);
DO $$
DECLARE v_before integer; v_capture uuid := gen_random_uuid(); v_animal public.animals;
DECLARE v_expected_xp integer; v_expected_level integer; v_expected_next integer;
BEGIN
  SELECT xp, level, xp_to_next INTO v_expected_xp, v_expected_level, v_expected_next FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx);
  v_before := v_expected_xp;
  v_expected_xp := v_expected_xp + 50;
  WHILE v_expected_xp >= v_expected_next LOOP
    v_expected_xp := v_expected_xp - v_expected_next;
    v_expected_level := v_expected_level + 1;
    v_expected_next := public.xp_needed_for_level(v_expected_level);
  END LOOP;
  SELECT a.* INTO v_animal FROM public.animals a JOIN security_proof p ON p.animal_id = a.id;
  INSERT INTO public.captures(id, user_id, image_url, animal_name, scientific_name, category, rarity, status, shared, economy_validation_id)
  VALUES (v_capture, (SELECT follower_id FROM security_ctx), 'https://faunex.fr/security-valid-proof.jpg', v_animal.name, v_animal.scientific_name, v_animal.category, 'hyper_rare', 'approved', true, (SELECT id FROM security_proof));
  IF NOT (SELECT xp_awarded FROM public.captures WHERE id = v_capture)
    OR (SELECT xp FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx)) <> v_expected_xp
    OR (SELECT level FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx)) <> v_expected_level
    OR (SELECT xp_to_next FROM public.profiles WHERE user_id = (SELECT follower_id FROM security_ctx)) <> v_expected_next THEN
    RAISE EXCEPTION 'valid_ai_capture_did_not_award_50_xp';
  END IF;
  CREATE TEMP TABLE security_bound_capture ON COMMIT DROP AS SELECT v_capture AS id;
END $$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT capture_id FROM public.capture_validations WHERE id = (SELECT id FROM security_proof)) <> (SELECT id FROM security_bound_capture) THEN
    RAISE EXCEPTION 'ai_proof_not_bound';
  END IF;
END $$;
GRANT SELECT ON pg_temp.security_bound_capture TO authenticated;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT follower_id::text FROM security_ctx), true);

-- Quatre emplacements au total sont acceptés, le cinquième est refusé tant que le compte est gratuit.
DO $$
BEGIN
  FOR i IN 1..4 LOOP
    INSERT INTO public.user_department_subscriptions(user_id, department_code, kind)
    VALUES ((SELECT follower_id FROM security_ctx), 'T' || i, 'department');
  END LOOP;
  BEGIN
    INSERT INTO public.user_department_subscriptions(user_id, department_code, kind)
    VALUES ((SELECT follower_id FROM security_ctx), 'T5', 'department');
    RAISE EXCEPTION 'fifth_free_slot_accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'free_slot_limit' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.custom_collections(user_id, name) VALUES ((SELECT follower_id FROM security_ctx), 'Refus gratuit');
    RAISE EXCEPTION 'free_custom_collection_accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN
      IF SQLERRM <> 'custom collections require premium' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;

-- Premium lève la limite et conserve la gestion des collections personnalisées.
INSERT INTO public.subscriptions(user_id, paddle_subscription_id, paddle_customer_id, product_id, price_id, status, environment, current_period_end)
VALUES ((SELECT follower_id FROM security_ctx), 'security_' || gen_random_uuid(), 'security_customer', 'faunex_premium', 'faunex_premium_yearly', 'active', 'live', now() + interval '1 year');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT follower_id::text FROM security_ctx), true);
DO $$
DECLARE v_collection uuid; v_animal public.animals;
BEGIN
  SELECT a.* INTO v_animal FROM public.animals a JOIN security_animals sa ON sa.animal_id = a.id AND sa.rn = 1;
  INSERT INTO public.user_department_subscriptions(user_id, department_code, kind)
  VALUES ((SELECT follower_id FROM security_ctx), 'T5', 'department');
  INSERT INTO public.custom_collections(user_id, name) VALUES ((SELECT follower_id FROM security_ctx), 'Collection Premium') RETURNING id INTO v_collection;
  INSERT INTO public.custom_collection_items(collection_id, user_id, animal_name)
  VALUES (v_collection, (SELECT follower_id FROM security_ctx), v_animal.name);
  IF v_collection IS NULL THEN RAISE EXCEPTION 'premium_collection_failed'; END IF;
END $$;
RESET ROLE;

-- Les accès directs qui exposaient les abonnements et jetons sont bien fermés.
DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.is_premium(uuid)', 'execute')
    OR has_function_privilege('authenticated', 'public.has_active_subscription(uuid,text)', 'execute') THEN
    RAISE EXCEPTION 'arbitrary_premium_lookup_still_public';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.my_premium_access()', 'execute') THEN
    RAISE EXCEPTION 'own_premium_lookup_broken';
  END IF;
  IF has_table_privilege('authenticated', 'public.native_push_devices', 'select')
    OR has_table_privilege('authenticated', 'public.native_push_devices', 'insert') THEN
    RAISE EXCEPTION 'native_push_table_still_public';
  END IF;
END $$;
ROLLBACK;
