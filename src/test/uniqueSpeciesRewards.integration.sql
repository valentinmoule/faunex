-- Privileged hosted check. Everything is rolled back, including the extra photo.
BEGIN;
DO $$
DECLARE
  u uuid := 'fb53d7d5-d325-4ac7-8ff9-b95637e5a561';
  existing public.captures%ROWTYPE;
  before_profile public.profiles%ROWTYPE;
  after_profile public.profiles%ROWTYPE;
  count_before bigint;
  count_after bigint;
  new_id uuid := gen_random_uuid();
BEGIN
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  SELECT * INTO STRICT existing FROM public.captures WHERE user_id=u AND status='approved' ORDER BY created_at LIMIT 1;
  SELECT * INTO STRICT before_profile FROM public.profiles WHERE user_id=u;
  SELECT captures INTO count_before FROM public.my_category_rank('all','global','all');
  INSERT INTO public.captures(id,user_id,image_url,animal_name,scientific_name,category,rarity,status,shared)
  VALUES(new_id,u,existing.image_url,existing.animal_name,existing.scientific_name,existing.category,existing.rarity,'approved',false);
  SELECT * INTO STRICT after_profile FROM public.profiles WHERE user_id=u;
  SELECT captures INTO count_after FROM public.my_category_rank('all','global','all');
  IF (before_profile.xp,before_profile.level,before_profile.xp_to_next) IS DISTINCT FROM (after_profile.xp,after_profile.level,after_profile.xp_to_next) THEN
    RAISE EXCEPTION 'Repeated photo must award exactly 0 XP';
  END IF;
  IF count_before IS DISTINCT FROM count_after THEN RAISE EXCEPTION 'Repeated photo must add exactly 0 species'; END IF;
  IF NOT (SELECT xp_awarded FROM public.captures WHERE id=new_id) THEN RAISE EXCEPTION 'Repeated photo was not settled'; END IF;
END $$;
ROLLBACK;