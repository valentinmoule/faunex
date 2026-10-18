-- Execute with a privileged SQL connection. Every change rolls back.
BEGIN;
DO $$
DECLARE
  u uuid := 'fb53d7d5-d325-4ac7-8ff9-b95637e5a561';
  capture_id uuid := gen_random_uuid();
  animal public.animals%ROWTYPE;
  profile public.profiles%ROWTYPE;
  awarded boolean;
  reward integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', u::text, true);
  SELECT * INTO STRICT animal FROM public.animals WHERE rarity='rare' LIMIT 1;
  UPDATE public.profiles SET xp=0, level=1, xp_to_next=50 WHERE user_id=u;
  INSERT INTO public.captures(id,user_id,image_url,animal_name,scientific_name,category,rarity,status,shared,xp_awarded)
  VALUES(capture_id,u,'https://faunex.fr/security-test-not-served.jpg',animal.name,animal.scientific_name,animal.category,'hyper_rare','pending',false,true);
  SELECT * INTO STRICT profile FROM public.profiles WHERE user_id=u;
  SELECT xp_awarded INTO awarded FROM public.captures WHERE id=capture_id;
  IF profile.xp<>0 OR profile.level<>1 OR awarded THEN RAISE EXCEPTION 'Pending captures must award zero XP, even with a forged marker'; END IF;

  UPDATE public.captures SET status='approved' WHERE id=capture_id;
  SELECT * INTO STRICT profile FROM public.profiles WHERE user_id=u;
  SELECT xp_awarded INTO awarded FROM public.captures WHERE id=capture_id;
  IF profile.level<>2 OR profile.xp<>70 OR NOT awarded THEN RAISE EXCEPTION 'Approved rare capture must award exactly 120 XP'; END IF;

  UPDATE public.captures SET status='approved',xp_awarded=false WHERE id=capture_id;
  SELECT * INTO STRICT profile FROM public.profiles WHERE user_id=u;
  IF profile.level<>2 OR profile.xp<>70 THEN RAISE EXCEPTION 'Updates and forged markers must not award XP twice'; END IF;

  DELETE FROM public.user_badges WHERE user_id=u AND badge_id='first_capture';
  IF NOT public.claim_badge('first_capture',500) THEN RAISE EXCEPTION 'An eligible badge must remain claimable'; END IF;
  SELECT xp_reward INTO reward FROM public.user_badges WHERE user_id=u AND badge_id='first_capture';
  IF reward<>50 THEN RAISE EXCEPTION 'First-capture badge must award 50 XP, ignoring submitted 500'; END IF;
  IF public.claim_badge('first_capture',500) THEN RAISE EXCEPTION 'A second badge claim must fail'; END IF;
END $$;
ROLLBACK;