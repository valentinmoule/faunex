BEGIN;
DO $$
DECLARE u uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); r jsonb;
BEGIN
 -- Positive legacy settings must never re-enable forbidden rewards.
 INSERT INTO public.economy_settings(id,enabled,launch_at,capture_reward,discovery_reward,daily_reward)
 VALUES(1,true,now()-interval '1 day',10,20,10)
 ON CONFLICT(id) DO UPDATE SET enabled=true,launch_at=now()-interval '1 day',capture_reward=10,discovery_reward=20,daily_reward=10;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 r:=public.claim_daily_eclats();
 IF (r->>'amount')::integer<>0 OR (r->>'awarded')::boolean THEN RAISE EXCEPTION 'Connection must award zero Eclats'; END IF;
 IF EXISTS(SELECT 1 FROM public.eclats_transactions WHERE user_id=u) THEN RAISE EXCEPTION 'Connection created a reward'; END IF;
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 INSERT INTO public.captures(id,user_id,image_url,animal_name,scientific_name,status)
 VALUES(c,u,'https://example.test/new','Renard roux','Vulpes vulpes','approved');
 INSERT INTO public.capture_validations(id,user_id,image_hash,animal_name,scientific_name,source)
 VALUES(v,u,repeat('c',64),'Renard roux','Vulpes vulpes','ai');
 r:=public.bind_capture_eclats(c,v,u,'https://example.test/new');
 IF (r->>'amount')::integer<>0 THEN RAISE EXCEPTION 'Validated capture must award zero Eclats'; END IF;
 IF EXISTS(SELECT 1 FROM public.eclats_transactions WHERE user_id=u AND kind='capture') THEN RAISE EXCEPTION 'Capture created a reward'; END IF;
 IF EXISTS(SELECT 1 FROM public.eclats_transactions WHERE user_id=u AND kind='discovery') THEN RAISE EXCEPTION 'Discovery created a reward'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.captures WHERE id=c AND status='approved') THEN RAISE EXCEPTION 'Capture functionality changed'; END IF;
END $$;
ROLLBACK;