import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_PACKAGE).href);
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION public.is_premium(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.premium',true),'false')='true' $$;
CREATE TABLE public.eclats_wallets(user_id uuid PRIMARY KEY,balance bigint NOT NULL DEFAULT 0);
CREATE TABLE public.eclats_transactions(user_id uuid,operation_key text,amount bigint,UNIQUE(user_id,operation_key));
CREATE FUNCTION public.eclats_apply(p_user uuid,p_key text,p_kind text,p_amount bigint,p_source text,p_version integer,p_actor uuid DEFAULT NULL,p_reason text DEFAULT NULL) RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN
IF current_setting('test.fail_credit',true)='true' THEN RAISE EXCEPTION 'TEST_CREDIT_FAILURE'; END IF;
IF EXISTS(SELECT 1 FROM public.eclats_transactions WHERE user_id=p_user AND operation_key=p_key) THEN RETURN 0; END IF;
INSERT INTO public.eclats_wallets(user_id,balance) VALUES(p_user,p_amount) ON CONFLICT(user_id) DO UPDATE SET balance=eclats_wallets.balance+excluded.balance;
INSERT INTO public.eclats_transactions VALUES(p_user,p_key,p_amount); RETURN p_amount; END $$;
`);
await db.exec(readFileSync('drizzle/migrations/0061_learning_paths_and_atomic_seed_rewards.sql','utf8'));
await db.exec(readFileSync('drizzle/migrations/0071_learning_seed_by_score.sql','utf8'));
await db.exec(readFileSync('src/test/learning.integration.sql','utf8'));
console.log('Learning: score-based seeds, 80% threshold, 3/10 daily limits, upgrade, replay top-up, UTC, privacy, prerequisites and rollback passed');
await db.close();