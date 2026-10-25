-- Privileged test connection; all data and configuration roll back.
BEGIN;
SET LOCAL statement_timeout='60s';
DO $$
DECLARE
 u uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); a public.animals;
 wallet public.eclats_wallets; cfg public.economy_settings; count_before integer; result jsonb;
BEGIN
 INSERT INTO public.economy_settings(id,enabled,launch_at) VALUES(1,true,now()-interval '1 minute') ON CONFLICT(id) DO UPDATE SET enabled=true,launch_at=now()-interval '1 minute';
 SELECT * INTO cfg FROM public.economy_settings WHERE id=1;
 IF cfg.capture_reward<>10 THEN RAISE EXCEPTION 'capture reward must be 10'; END IF;
 IF cfg.discovery_reward<>20 THEN RAISE EXCEPTION 'discovery reward must be 20'; END IF;
 IF cfg.daily_reward<>10 THEN RAISE EXCEPTION 'daily reward must be 10'; END IF;
 IF cfg.exercise_reward<>5 THEN RAISE EXCEPTION 'exercise reward must be 5'; END IF;
 IF cfg.chapter_reward<>30 THEN RAISE EXCEPTION 'chapter reward must be 30'; END IF;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 result:=public.claim_daily_eclats();
 IF (result->>'amount')::integer<>10 THEN RAISE EXCEPTION 'daily must credit 10'; END IF;
 result:=public.claim_daily_eclats();
 IF (result->>'awarded')::boolean THEN RAISE EXCEPTION 'daily awarded twice'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.eclats_transactions WHERE user_id=u AND operation_key='daily:'||(now() AT TIME ZONE 'UTC')::date::text) THEN RAISE EXCEPTION 'daily key must use server UTC'; END IF;
 IF has_table_privilege('authenticated','public.eclats_wallets','UPDATE') THEN RAISE EXCEPTION 'wallet is client writable'; END IF;
 IF has_table_privilege('authenticated','public.capture_validations','INSERT') THEN RAISE EXCEPTION 'proof is client forgeable'; END IF;
 IF has_function_privilege('authenticated','public.eclats_apply(uuid,text,text,bigint,text,integer,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'credit helper exposed'; END IF;
 PERFORM public.eclats_apply(u,'test:gain','capture',30,'test',1);
 PERFORM public.eclats_apply(u,'test:gain','capture',30,'test',1);
 SELECT * INTO STRICT wallet FROM public.eclats_wallets WHERE user_id=u;
 IF wallet.balance<>40 THEN RAISE EXCEPTION 'duplicate credit'; END IF;
 PERFORM public.eclats_apply(u,'test:revoke','reversal',-60,'test',1);
 SELECT * INTO STRICT wallet FROM public.eclats_wallets WHERE user_id=u;
 IF wallet.balance<>0 OR wallet.debt<>20 THEN RAISE EXCEPTION 'reversal must stay nonnegative with debt 20'; END IF;
 PERFORM public.eclats_apply(u,'test:future1','capture',10,'test',1);
 SELECT * INTO STRICT wallet FROM public.eclats_wallets WHERE user_id=u;
 IF wallet.balance<>0 OR wallet.debt<>10 THEN RAISE EXCEPTION 'future reward must offset debt first'; END IF;
 PERFORM public.eclats_apply(u,'test:future2','capture',30,'test',1);
 SELECT * INTO STRICT wallet FROM public.eclats_wallets WHERE user_id=u;
 IF wallet.balance<>20 OR wallet.debt<>0 THEN RAISE EXCEPTION 'offset remainder wrong'; END IF;
 BEGIN
 UPDATE public.eclats_transactions SET amount=999 WHERE user_id=u;
 RAISE EXCEPTION 'history mutable';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'IMMUTABLE_ECLATS_HISTORY' THEN RAISE; END IF;
 END;
 BEGIN
 PERFORM public.admin_adjust_eclats(u,100,gen_random_uuid(),'not authorized');
 RAISE EXCEPTION 'non-admin adjustment allowed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'FORBIDDEN' THEN RAISE; END IF;
 END;
END $$;
ROLLBACK;