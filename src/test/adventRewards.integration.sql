-- Run in a privileged transaction; all fixtures and awarded XP roll back.
BEGIN;
DO $$
DECLARE u uuid; c uuid:=gen_random_uuid(); days jsonb; n integer; before_xp integer; after_xp integer;
BEGIN
 SELECT user_id INTO STRICT u FROM public.user_roles WHERE role='admin' LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 SELECT jsonb_agg(jsonb_build_object('day',d,'title','Test','categories',jsonb_build_array('Mammifères'),'xp',50)) INTO days FROM generate_series(1,24) d;
 INSERT INTO public.themed_collections(id,title,event_kind,calendar_year,calendar_days,published) VALUES(c,'Private Advent regression','advent',2026,days,false);
 IF public.advent_day_start(2026,1)<>'2026-11-30T23:00:00Z'::timestamptz OR public.advent_day_start(2026,24)<>'2026-12-23T23:00:00Z'::timestamptz THEN RAISE EXCEPTION 'Paris midnight boundary failed'; END IF;
 IF NOT public.advent_matches('["Mammifères"]','Mammifères (monde)') OR public.advent_matches('["Mammifères"]','Oiseaux') THEN RAISE EXCEPTION 'Category rule failed'; END IF;
 INSERT INTO public.advent_submissions(collection_id,user_id,day,capture_id,image_url,submitted_at,approved_at) SELECT c,u,d,gen_random_uuid(),'private-test-'||d,public.advent_day_start(2026,d),now() FROM generate_series(1,23) d;
 IF public.reward_eligibility('advent_'||c,'Europe/Paris') IS NOT NULL THEN RAISE EXCEPTION '23 days cannot earn final badge'; END IF;
 SELECT xp INTO before_xp FROM public.profiles WHERE user_id=u;
 n:=public.claim_advent_day(c,1); IF n<>50 THEN RAISE EXCEPTION 'Daily reward must be 50 XP'; END IF;
 SELECT xp INTO after_xp FROM public.profiles WHERE user_id=u;
 IF public.claim_advent_day(c,1) IS NOT NULL THEN RAISE EXCEPTION 'Repeated daily claim must fail'; END IF;
 IF (SELECT xp FROM public.profiles WHERE user_id=u)<>after_xp THEN RAISE EXCEPTION 'Repeated claim changed XP'; END IF;
 INSERT INTO public.advent_submissions(collection_id,user_id,day,capture_id,image_url,submitted_at,approved_at) VALUES(c,u,24,gen_random_uuid(),'private-test-24',public.advent_day_start(2026,24),now());
 IF public.reward_eligibility('advent_'||c,'Europe/Paris')<>300 THEN RAISE EXCEPTION 'Final reward must be 300 XP at 24 days'; END IF;
 IF NOT public.claim_badge('advent_'||c,999999) THEN RAISE EXCEPTION 'Final badge claim failed'; END IF;
 IF (SELECT xp_reward FROM public.user_badges WHERE user_id=u AND badge_id='advent_'||c)<>300 THEN RAISE EXCEPTION 'Client XP was trusted'; END IF;
 IF public.claim_badge('advent_'||c,999999) THEN RAISE EXCEPTION 'Final badge claimed twice'; END IF;
END $$;
ROLLBACK;