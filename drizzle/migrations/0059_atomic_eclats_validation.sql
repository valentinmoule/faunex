CREATE OR REPLACE FUNCTION public.bind_capture_eclats(p_capture uuid,p_proof uuid,p_user uuid,p_url text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.captures; v public.capture_validations; previous_count integer; amount bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('eclats:'||p_user::text,0));
 SELECT * INTO c FROM public.captures WHERE id=p_capture AND user_id=p_user FOR UPDATE;
 SELECT * INTO v FROM public.capture_validations WHERE id=p_proof AND user_id=p_user FOR UPDATE;
 IF c.id IS NULL OR v.id IS NULL OR c.status<>'approved' OR c.image_url IS DISTINCT FROM p_url OR v.revoked_at IS NOT NULL OR v.expires_at<now() OR(v.capture_id IS NOT NULL AND v.capture_id<>p_capture) THEN RAISE EXCEPTION 'INVALID_PROOF'; END IF;
 IF v.consumed_at IS NOT NULL THEN RETURN jsonb_build_object('success',true,'amount',0); END IF;
 IF lower(btrim(c.animal_name))<>lower(btrim(v.animal_name)) OR lower(btrim(coalesce(c.scientific_name,'')))<>lower(btrim(coalesce(v.scientific_name,''))) THEN RETURN jsonb_build_object('success',true,'amount',0,'deferred','identity'); END IF;
 SELECT count(*) INTO previous_count FROM public.eclats_transactions WHERE user_id=p_user;
 UPDATE public.capture_validations SET capture_id=p_capture,image_url=p_url WHERE id=p_proof;
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 UPDATE public.captures SET economy_validation_id=p_proof WHERE id=p_capture;
 IF (SELECT count(*) FROM public.eclats_transactions WHERE user_id=p_user)=previous_count THEN amount:=0;
 ELSE SELECT coalesce(sum(balance_delta),0) INTO amount FROM public.eclats_transactions WHERE user_id=p_user AND (operation_key='capture:'||p_capture OR operation_key='discovery:'||(SELECT animal_id FROM public.eclats_capture_events WHERE capture_id=p_capture)); END IF;
 RETURN jsonb_build_object('success',true,'amount',amount);
END $$;
REVOKE ALL ON FUNCTION public.bind_capture_eclats(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bind_capture_eclats(uuid,uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_economy_receipt_binding() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.capture_id IS NOT NULL AND NEW.capture_id IS DISTINCT FROM OLD.capture_id THEN RAISE EXCEPTION 'PROOF_ALREADY_BOUND'; END IF;
 IF OLD.consumed_at IS NOT NULL AND(NEW.image_url IS DISTINCT FROM OLD.image_url OR NEW.animal_name IS DISTINCT FROM OLD.animal_name OR NEW.scientific_name IS DISTINCT FROM OLD.scientific_name OR NEW.image_hash IS DISTINCT FROM OLD.image_hash) THEN RAISE EXCEPTION 'PROOF_ALREADY_CONSUMED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_economy_receipt_binding BEFORE UPDATE ON public.capture_validations FOR EACH ROW EXECUTE FUNCTION public.guard_economy_receipt_binding();