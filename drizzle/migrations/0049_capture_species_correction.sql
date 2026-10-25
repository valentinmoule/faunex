ALTER TABLE public.captures ADD COLUMN correction_requested_at timestamptz, ADD COLUMN correction_name text, ADD COLUMN correction_scientific_name text, ADD COLUMN correction_note text;
CREATE OR REPLACE FUNCTION public.request_capture_correction(p_capture uuid,p_name text,p_scientific text DEFAULT NULL,p_note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); c public.captures; remaining integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('ai:'||u::text,0));
 SELECT * INTO c FROM public.captures WHERE id=p_capture AND user_id=u FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('reason','not_owner'); END IF;
 IF c.status='pending_review' THEN RETURN jsonb_build_object('reason','already_pending'); END IF;
 IF c.status<>'approved' THEN RETURN jsonb_build_object('reason','invalid_status'); END IF;
 IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 120 OR length(coalesce(p_scientific,''))>160 OR length(coalesce(p_note,''))>500 THEN RETURN jsonb_build_object('reason','invalid_name'); END IF;
 remaining:=public.consume_ai_analysis(u,gen_random_uuid());
 IF remaining<0 THEN RETURN jsonb_build_object('reason','daily_limit'); END IF;
 PERFORM set_config('app.capture_correction',u::text,true);
 UPDATE public.captures SET status='pending_review',correction_requested_at=now(),correction_name=trim(p_name),correction_scientific_name=nullif(trim(p_scientific),''),correction_note=nullif(trim(p_note),'') WHERE id=p_capture;
 RETURN jsonb_build_object('success',true,'remaining',remaining);
END $$;
REVOKE ALL ON FUNCTION public.request_capture_correction(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_capture_correction(uuid,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_capture_correction() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role()='authenticated' AND NOT public.has_role(auth.uid(),'admin') AND coalesce(current_setting('app.capture_correction',true),'')<>auth.uid()::text AND ((TG_OP='INSERT' AND NEW.correction_requested_at IS NOT NULL) OR (TG_OP='UPDATE' AND ROW(NEW.correction_requested_at,NEW.correction_name,NEW.correction_scientific_name,NEW.correction_note) IS DISTINCT FROM ROW(OLD.correction_requested_at,OLD.correction_name,OLD.correction_scientific_name,OLD.correction_note))) THEN RAISE EXCEPTION 'CORRECTION_RPC_REQUIRED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_capture_correction BEFORE INSERT OR UPDATE ON public.captures FOR EACH ROW EXECUTE FUNCTION public.guard_capture_correction();
DROP TRIGGER captures_auto_moderate_update ON public.captures;
CREATE TRIGGER captures_auto_moderate_update AFTER UPDATE OF status ON public.captures FOR EACH ROW WHEN (NEW.status='pending_review' AND OLD.status IS DISTINCT FROM 'pending_review' AND NEW.correction_requested_at IS NULL) EXECUTE FUNCTION public.trigger_auto_moderate_capture();