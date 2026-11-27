// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const premium = '00000000-0000-4000-8000-000000000001';
const free = '00000000-0000-4000-8000-000000000002';
let db: PGlite;
const scalar = async <T>(sql: string, params: unknown[] = []) =>
  (await db.query<{ value: T }>(sql, params)).rows[0]?.value;
const seed = (count: number, user = premium, last = 'now()') => db.exec(`
  INSERT INTO public.ai_analysis_attempts(user_id, request_id, created_at)
  SELECT '${user}', gen_random_uuid(), ${last} - ((${count} - n) * interval '2 minutes')
  FROM generate_series(1, ${count}) n;
`);
const status = (at = 'now()', user = premium) => scalar<{ reason: string; remaining: number; retry_at: string | null }>(
  `SELECT public.ai_quota_status_for($1, ${at}) AS value`, [user],
);
const consume = (user = premium, request = crypto.randomUUID()) => scalar<number>(
  'SELECT public.consume_ai_analysis($1, $2) AS value', [user, request],
);

describe('Premium daily analysis protection (actual PostgreSQL migration)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION public.is_premium(p_user uuid) RETURNS boolean LANGUAGE sql AS
        $$ SELECT p_user = '${premium}'::uuid $$;
      CREATE TABLE public.ai_analysis_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        request_id uuid, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX ON public.ai_analysis_attempts(user_id, request_id) WHERE request_id IS NOT NULL;
    `);
    await db.exec(readFileSync('drizzle/migrations/0165_premium_analysis_two_daily_batches.sql', 'utf8'));
  }, 30_000);
  beforeEach(async () => { await db.exec('TRUNCATE public.ai_analysis_attempts'); });
  afterAll(async () => { await db.close(); });

  it('accepts the 200th daily analysis and pauses despite fewer than 200 in the last hour', async () => {
    // Fixed midday avoids a test depending on the machine time of day.
    await seed(200, premium, "'2026-11-27 12:00:00Z'::timestamptz");
    expect((await status("'2026-11-27 12:00:00Z'"))?.reason).toBe('premium_pause');
    expect(await scalar<number>("SELECT count(*)::integer AS value FROM ai_analysis_attempts WHERE created_at >= '2026-11-27 11:00:00Z'")).toBe(31);
    const value = await status("'2026-11-27 12:00:00Z'");
    expect(Date.parse(value?.retry_at ?? '')).toBe(Date.parse('2026-11-27T13:00:00Z'));
  });

  it('unlocks exactly one hour after the 200th, with 200 more analyses available', async () => {
    await seed(200, premium, "'2026-11-27 12:00:00Z'::timestamptz");
    expect((await status("'2026-11-27 12:59:59Z'"))?.remaining).toBe(0);
    expect(await status("'2026-11-27 13:00:00Z'")).toMatchObject({ reason: 'available', remaining: 200 });
  });

  it('blocks at 400 until the next UTC day and resets at midnight', async () => {
    await seed(400, premium, "'2026-11-27 18:00:00Z'::timestamptz");
    expect(await status("'2026-11-27 23:59:59Z'")).toMatchObject({ reason: 'premium_daily_limit', remaining: 0 });
    expect(await status("'2026-11-28 00:00:00Z'")).toMatchObject({ reason: 'available', remaining: 400 });
  });

  it('allows 199 then accepts the 200th, refuses the 201st during the pause, and keeps request retries idempotent', async () => {
    // Seed within today's actual time; identical timestamps are ordered by id.
    await db.exec(`INSERT INTO ai_analysis_attempts(user_id, request_id, created_at)
      SELECT '${premium}', gen_random_uuid(), now() FROM generate_series(1,199)`);
    const request = crypto.randomUUID();
    expect(await consume(premium, request)).toBe(0);
    expect(await consume()).toBe(-2);
    expect(await consume(premium, request)).toBe(0);
    expect(await scalar<number>('SELECT count(*)::integer AS value FROM ai_analysis_attempts')).toBe(200);
  });

  it('keeps free users at 4 analyses per day', async () => {
    expect(await consume(free)).toBe(3);
    expect(await consume(free)).toBe(2);
    expect(await consume(free)).toBe(1);
    expect(await consume(free)).toBe(0);
    expect(await consume(free)).toBe(-1);
    expect(await scalar<number>('SELECT count(*)::integer AS value FROM ai_analysis_attempts')).toBe(4);
  });

  it('refuses a new 401st request with the daily code, without recording it', async () => {
    await db.exec(`INSERT INTO ai_analysis_attempts(user_id, request_id, created_at)
      SELECT '${premium}', gen_random_uuid(), now() FROM generate_series(1,400)`);
    expect(await consume()).toBe(-3);
    expect(await scalar<number>('SELECT count(*)::integer AS value FROM ai_analysis_attempts')).toBe(400);
  });

  it('does not allow the legacy one-argument function to bypass the pause', async () => {
    await db.exec(`INSERT INTO ai_analysis_attempts(user_id, request_id, created_at)
      SELECT '${premium}', gen_random_uuid(), now() FROM generate_series(1,200)`);
    expect(await scalar<number>('SELECT public.consume_ai_analysis($1::uuid) AS value', [premium])).toBe(-2);
  });

  it('reads only the authenticated account and exposes no service guard to authenticated users', async () => {
    await db.exec(`SELECT set_config('request.jwt.claim.sub', '${free}', false)`);
    expect(await scalar('SELECT public.ai_analyses_remaining_today() AS value')).toBe(4);
    expect(await scalar("SELECT has_function_privilege('authenticated', 'public.consume_ai_analysis(uuid,uuid)', 'EXECUTE') AS value")).toBe(false);
    expect(await scalar("SELECT has_function_privilege('authenticated', 'public.ai_quota_status_for(uuid,timestamptz)', 'EXECUTE') AS value")).toBe(false);
    expect(await scalar("SELECT has_function_privilege('anon', 'public.get_ai_analysis_status()', 'EXECUTE') AS value")).toBe(false);
  });
});