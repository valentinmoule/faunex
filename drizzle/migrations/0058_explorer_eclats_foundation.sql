CREATE TABLE public.economy_settings(id integer PRIMARY KEY DEFAULT 1 CHECK(id=1),enabled boolean NOT NULL DEFAULT false,launch_at timestamptz NOT NULL DEFAULT now(),version integer NOT NULL DEFAULT 1,capture_reward integer NOT NULL DEFAULT 10 CHECK(capture_reward BETWEEN 0 AND 10000),discovery_reward integer NOT NULL DEFAULT 20 CHECK(discovery_reward BETWEEN 0 AND 10000),daily_reward integer NOT NULL DEFAULT 10 CHECK(daily_reward BETWEEN 0 AND 10000),exercise_reward integer NOT NULL DEFAULT 5 CHECK(exercise_reward BETWEEN 0 AND 10000),chapter_reward integer NOT NULL DEFAULT 30 CHECK(chapter_reward BETWEEN 0 AND 10000));
GRANT ALL ON public.economy_settings TO service_role;
ALTER TABLE public.economy_settings ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.eclats_wallets(user_id uuid PRIMARY KEY,balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0),earned bigint NOT NULL DEFAULT 0 CHECK(earned>=0),reversed bigint NOT NULL DEFAULT 0 CHECK(reversed>=0),debt bigint NOT NULL DEFAULT 0 CHECK(debt>=0),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.eclats_wallets TO authenticated; GRANT ALL ON public.eclats_wallets TO service_role;
ALTER TABLE public.eclats_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_owner_read ON public.eclats_wallets FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.eclats_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,operation_key text NOT NULL,kind text NOT NULL,amount bigint NOT NULL,balance_delta bigint NOT NULL,debt_delta bigint NOT NULL DEFAULT 0,balance_after bigint NOT NULL CHECK(balance_after>=0),source_id text,rule_version integer NOT NULL,actor_id uuid,reason text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,operation_key));
GRANT SELECT ON public.eclats_transactions TO authenticated; GRANT ALL ON public.eclats_transactions TO service_role;
ALTER TABLE public.eclats_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_owner_read ON public.eclats_transactions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX eclats_history_idx ON public.eclats_transactions(user_id,created_at DESC,id DESC);
CREATE TABLE public.eclats_species_redirects(old_animal_id uuid PRIMARY KEY,new_animal_id uuid NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK(old_animal_id<>new_animal_id));
GRANT ALL ON public.eclats_species_redirects TO service_role;
ALTER TABLE public.eclats_species_redirects ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.eclats_discoveries(user_id uuid NOT NULL,animal_id uuid NOT NULL,first_capture_id uuid,historical boolean NOT NULL DEFAULT false,bonus_awarded boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,animal_id));
GRANT SELECT ON public.eclats_discoveries TO authenticated; GRANT ALL ON public.eclats_discoveries TO service_role;
ALTER TABLE public.eclats_discoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY discoveries_owner_read ON public.eclats_discoveries FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.eclats_historical_names(user_id uuid NOT NULL,normalized_name text NOT NULL,PRIMARY KEY(user_id,normalized_name));
GRANT ALL ON public.eclats_historical_names TO service_role;
ALTER TABLE public.eclats_historical_names ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.capture_validations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,image_hash text NOT NULL CHECK(image_hash ~ '^[a-f0-9]{64}$'),animal_name text NOT NULL,scientific_name text,source text NOT NULL CHECK(source IN ('ai','auto_moderation','human_moderation')),image_url text,capture_id uuid,consumed_at timestamptz,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT(now()+interval '24 hours'));
GRANT ALL ON public.capture_validations TO service_role;
ALTER TABLE public.capture_validations ENABLE ROW LEVEL SECURITY;
CREATE INDEX capture_validations_capture_idx ON public.capture_validations(capture_id);
ALTER TABLE public.captures ADD COLUMN economy_validation_id uuid;
CREATE TABLE public.eclats_capture_events(capture_id uuid PRIMARY KEY,user_id uuid NOT NULL,image_hash text NOT NULL,animal_id uuid,base_awarded integer NOT NULL DEFAULT 0,discovery_awarded integer NOT NULL DEFAULT 0,rule_version integer NOT NULL,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,image_hash));
GRANT ALL ON public.eclats_capture_events TO service_role;
ALTER TABLE public.eclats_capture_events ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.eclats_immutable_transaction() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE_ECLATS_HISTORY'; END $$;
CREATE TRIGGER immutable_eclats_history BEFORE UPDATE OR DELETE ON public.eclats_transactions FOR EACH ROW EXECUTE FUNCTION public.eclats_immutable_transaction();
CREATE OR REPLACE FUNCTION public.eclats_animal_id(p_name text,p_scientific text) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a uuid; next_id uuid; visited uuid[]:=ARRAY[]::uuid[];
BEGIN
 SELECT id INTO a FROM public.animals WHERE lower(btrim(name))=lower(btrim(p_name)) AND (nullif(btrim(p_scientific),'') IS NULL OR nullif(btrim(scientific_name),'') IS NULL OR lower(btrim(scientific_name))=lower(btrim(p_scientific))) ORDER BY created_at,id LIMIT 1;
 IF a IS NULL THEN RETURN NULL; END IF;
 LOOP
 IF a=ANY(visited) OR cardinality(visited)>32 THEN RETURN NULL; END IF;
 visited:=array_append(visited,a);
 SELECT new_animal_id INTO next_id FROM public.eclats_species_redirects WHERE old_animal_id=a;
 IF next_id IS NULL THEN RETURN a; END IF; a:=next_id;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.eclats_animal_id(text,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.eclats_animal_id(text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.eclats_apply(p_user uuid,p_key text,p_kind text,p_amount bigint,p_source text,p_version integer,p_actor uuid DEFAULT NULL,p_reason text DEFAULT NULL) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.eclats_wallets; delta bigint; debt_delta bigint; compensated bigint;
BEGIN
 IF p_amount=0 THEN RETURN 0; END IF;
 IF abs(p_amount)>1000000 OR p_key IS NULL THEN RAISE EXCEPTION 'INVALID_ECLATS_OPERATION'; END IF;
 INSERT INTO public.eclats_wallets(user_id) VALUES(p_user) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT w FROM public.eclats_wallets WHERE user_id=p_user FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.eclats_transactions WHERE user_id=p_user AND operation_key=p_key) THEN RETURN 0; END IF;
 IF p_amount>0 THEN
 compensated:=least(w.debt,p_amount); delta:=p_amount-compensated; debt_delta:=-compensated;
 UPDATE public.eclats_wallets SET balance=balance+delta,debt=debt+debt_delta,earned=earned+p_amount,updated_at=now() WHERE user_id=p_user;
 ELSE
 delta:=-least(w.balance,-p_amount); debt_delta:=-p_amount+delta;
 UPDATE public.eclats_wallets SET balance=balance+delta,debt=debt+debt_delta,reversed=reversed-p_amount,updated_at=now() WHERE user_id=p_user;
 END IF;
 INSERT INTO public.eclats_transactions(user_id,operation_key,kind,amount,balance_delta,debt_delta,balance_after,source_id,rule_version,actor_id,reason) VALUES(p_user,p_key,p_kind,p_amount,delta,debt_delta,w.balance+delta,p_source,p_version,p_actor,p_reason);
 RETURN delta;
END $$;
REVOKE ALL ON FUNCTION public.eclats_apply(uuid,text,text,bigint,text,integer,uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.eclats_apply(uuid,text,text,bigint,text,integer,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_economy_validation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.economy_validation_id IS DISTINCT FROM OLD.economy_validation_id AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'ECONOMY_PROOF_SERVER_ONLY'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_economy_validation BEFORE UPDATE ON public.captures FOR EACH ROW EXECUTE FUNCTION public.guard_economy_validation();
CREATE OR REPLACE FUNCTION public.reward_capture_eclats() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.economy_settings; proof public.capture_validations; a uuid; event public.eclats_capture_events; inserted integer;
BEGIN
 IF NEW.status<>'approved' THEN RETURN NEW; END IF;
 SELECT * INTO cfg FROM public.economy_settings WHERE id=1;
 a:=public.eclats_animal_id(NEW.animal_name,NEW.scientific_name);
 IF cfg.id IS NULL OR NOT cfg.enabled OR NEW.created_at<cfg.launch_at THEN
 INSERT INTO public.eclats_historical_names(user_id,normalized_name) VALUES(NEW.user_id,public.normalize_animal_label(NEW.animal_name)) ON CONFLICT DO NOTHING;
 IF a IS NOT NULL THEN INSERT INTO public.eclats_discoveries(user_id,animal_id,first_capture_id,historical) VALUES(NEW.user_id,a,NEW.id,true) ON CONFLICT DO NOTHING; END IF;
 RETURN NEW;
 END IF;
 IF NEW.economy_validation_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO proof FROM public.capture_validations WHERE id=NEW.economy_validation_id AND user_id=NEW.user_id FOR UPDATE;
 IF proof.id IS NULL OR proof.revoked_at IS NOT NULL OR proof.expires_at<now() OR proof.image_url IS DISTINCT FROM NEW.image_url OR public.normalize_animal_label(proof.animal_name)<>public.normalize_animal_label(NEW.animal_name) OR public.normalize_animal_label(coalesce(proof.scientific_name,''))<>public.normalize_animal_label(coalesce(NEW.scientific_name,'')) OR(proof.capture_id IS NOT NULL AND proof.capture_id<>NEW.id) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('eclats:'||NEW.user_id::text,0));
 SELECT * INTO event FROM public.eclats_capture_events WHERE capture_id=NEW.id FOR UPDATE;
 IF event.capture_id IS NOT NULL THEN
 IF event.revoked_at IS NOT NULL OR a IS NULL OR event.animal_id IS NOT DISTINCT FROM a OR proof.source='ai' THEN RETURN NEW; END IF;
 IF event.discovery_awarded>0 THEN PERFORM public.eclats_apply(NEW.user_id,'correction-reverse:'||proof.id,'correction',-event.discovery_awarded,NEW.id::text,cfg.version); END IF;
 UPDATE public.eclats_capture_events SET animal_id=a,discovery_awarded=0 WHERE capture_id=NEW.id;
 ELSE
 IF proof.consumed_at IS NOT NULL THEN RETURN NEW; END IF;
 INSERT INTO public.eclats_capture_events(capture_id,user_id,image_hash,animal_id,base_awarded,rule_version) VALUES(NEW.id,NEW.user_id,proof.image_hash,a,cfg.capture_reward,cfg.version) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT; IF inserted=0 THEN RETURN NEW; END IF;
 PERFORM public.eclats_apply(NEW.user_id,'capture:'||NEW.id,'capture',cfg.capture_reward,NEW.id::text,cfg.version);
 END IF;
 UPDATE public.capture_validations SET consumed_at=coalesce(consumed_at,now()),capture_id=NEW.id WHERE id=proof.id;
 IF a IS NOT NULL THEN
 INSERT INTO public.eclats_discoveries(user_id,animal_id,first_capture_id,historical) VALUES(NEW.user_id,a,NEW.id,EXISTS(SELECT 1 FROM public.eclats_historical_names WHERE user_id=NEW.user_id AND normalized_name=public.normalize_animal_label(NEW.animal_name))) ON CONFLICT DO NOTHING;
 UPDATE public.eclats_discoveries SET bonus_awarded=true WHERE user_id=NEW.user_id AND animal_id=a AND NOT historical AND NOT bonus_awarded;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=1 THEN
 PERFORM public.eclats_apply(NEW.user_id,'discovery:'||a,'discovery',cfg.discovery_reward,a::text,cfg.version);
 UPDATE public.eclats_capture_events SET discovery_awarded=cfg.discovery_reward WHERE capture_id=NEW.id;
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zzzzz_eclats_capture AFTER INSERT OR UPDATE ON public.captures FOR EACH ROW EXECUTE FUNCTION public.reward_capture_eclats();
CREATE OR REPLACE FUNCTION public.my_eclats_wallet() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE u uuid:=auth.uid(); w public.eclats_wallets; enabled boolean; BEGIN IF u IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF; SELECT s.enabled INTO enabled FROM public.economy_settings s WHERE id=1; SELECT * INTO w FROM public.eclats_wallets WHERE user_id=u; RETURN jsonb_build_object('enabled',coalesce(enabled,false),'balance',coalesce(w.balance,0),'debt',coalesce(w.debt,0),'earned',coalesce(w.earned,0)); END $$;
REVOKE ALL ON FUNCTION public.my_eclats_wallet() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.my_eclats_wallet() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.claim_daily_eclats() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); cfg public.economy_settings; delta bigint; key text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
 SELECT * INTO cfg FROM public.economy_settings WHERE id=1;
 IF cfg.id IS NULL OR NOT cfg.enabled THEN RETURN jsonb_build_object('awarded',false,'amount',0); END IF;
 key:='daily:'||(now() AT TIME ZONE 'UTC')::date::text;
 PERFORM pg_advisory_xact_lock(hashtextextended('eclats:'||u::text,0));
 IF EXISTS(SELECT 1 FROM public.eclats_transactions WHERE user_id=u AND operation_key=key) THEN RETURN jsonb_build_object('awarded',false,'amount',0); END IF;
 delta:=public.eclats_apply(u,key,'daily',cfg.daily_reward,(now() AT TIME ZONE 'UTC')::date::text,cfg.version);
 RETURN jsonb_build_object('awarded',true,'amount',delta,'gross',cfg.daily_reward,'day',(now() AT TIME ZONE 'UTC')::date);
END $$;
REVOKE ALL ON FUNCTION public.claim_daily_eclats() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.claim_daily_eclats() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_adjust_eclats(p_user uuid,p_amount integer,p_operation uuid,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF; IF p_operation IS NULL OR p_amount=0 OR abs(p_amount)>100000 OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'INVALID_ADJUSTMENT'; END IF; PERFORM pg_advisory_xact_lock(hashtextextended('eclats:'||p_user::text,0)); PERFORM public.eclats_apply(p_user,'admin:'||p_operation,'adjustment',p_amount,p_operation::text,1,auth.uid(),p_reason); RETURN jsonb_build_object('success',true); END $$;
REVOKE ALL ON FUNCTION public.admin_adjust_eclats(uuid,integer,uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.admin_adjust_eclats(uuid,integer,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_revoke_capture_eclats(p_capture uuid,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE e public.eclats_capture_events; BEGIN IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF; IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'INVALID_REASON'; END IF; SELECT * INTO e FROM public.eclats_capture_events WHERE capture_id=p_capture; IF e.capture_id IS NULL THEN RETURN jsonb_build_object('revoked',false); END IF; PERFORM pg_advisory_xact_lock(hashtextextended('eclats:'||e.user_id::text,0)); SELECT * INTO e FROM public.eclats_capture_events WHERE capture_id=p_capture FOR UPDATE; IF e.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('revoked',false); END IF; PERFORM public.eclats_apply(e.user_id,'fraud:'||p_capture,'reversal',-(e.base_awarded+e.discovery_awarded),p_capture::text,e.rule_version,auth.uid(),p_reason); UPDATE public.eclats_capture_events SET revoked_at=now() WHERE capture_id=p_capture; UPDATE public.capture_validations SET revoked_at=now() WHERE capture_id=p_capture; RETURN jsonb_build_object('revoked',true); END $$;
REVOKE ALL ON FUNCTION public.admin_revoke_capture_eclats(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.admin_revoke_capture_eclats(uuid,text) TO authenticated;
LOCK TABLE public.captures IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.eclats_historical_names(user_id,normalized_name) SELECT DISTINCT user_id,public.normalize_animal_label(animal_name) FROM public.captures WHERE status='approved' OR(status='pending_review' AND xp_awarded) ON CONFLICT DO NOTHING;
INSERT INTO public.eclats_discoveries(user_id,animal_id,historical) SELECT DISTINCT c.user_id,a.id,true FROM public.captures c JOIN public.animals a ON lower(btrim(a.name))=lower(btrim(c.animal_name)) WHERE(c.status='approved' OR(c.status='pending_review' AND c.xp_awarded)) ON CONFLICT DO NOTHING;