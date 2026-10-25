BEGIN;
DO $$
DECLARE u uuid; c public.captures; result jsonb; before_count integer; before_capture_count integer; before_xp integer; before_level integer;
BEGIN
 SELECT * INTO STRICT c FROM public.captures WHERE status='approved' AND xp_awarded=true LIMIT 1;
 u:=c.user_id;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 DELETE FROM public.ai_analysis_attempts WHERE user_id=u;
 SELECT count(*) INTO before_capture_count FROM public.captures WHERE user_id=u;
 SELECT xp,level INTO before_xp,before_level FROM public.profiles WHERE user_id=u;
 result:=public.request_capture_correction(c.id,c.animal_name,c.scientific_name,'Integration correction');
 IF NOT (result->>'success')::boolean THEN RAISE EXCEPTION 'Correction must accept own approved capture: %',result; END IF;
 SELECT count(*) INTO before_count FROM public.ai_analysis_attempts WHERE user_id=u;
 IF before_count<>1 THEN RAISE EXCEPTION 'Each request must consume exactly one analysis'; END IF;
 IF (SELECT count(*) FROM public.captures WHERE user_id=u)<>before_capture_count THEN RAISE EXCEPTION 'Correction must reuse same capture'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.captures WHERE id=c.id AND image_url=c.image_url AND status='pending_review' AND correction_name=c.animal_name AND xp_awarded=c.xp_awarded) THEN RAISE EXCEPTION 'Photo and XP state must survive resubmission'; END IF;
 result:=public.request_capture_correction(c.id,c.animal_name,c.scientific_name,NULL);
 IF result->>'reason'<>'already_pending' OR (SELECT count(*) FROM public.ai_analysis_attempts WHERE user_id=u)<>1 THEN RAISE EXCEPTION 'Repeated submission must not charge again'; END IF;
 UPDATE public.captures SET status='approved' WHERE id=c.id;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=u AND xp=before_xp AND level=before_level) THEN RAISE EXCEPTION 'Reapproval must not award extra XP'; END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 result:=public.request_capture_correction(c.id,c.animal_name,NULL,NULL);
 IF result->>'reason'<>'not_owner' THEN RAISE EXCEPTION 'Another user must not resubmit this capture'; END IF;
END $$;
ROLLBACK;
