// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const group = '00000000-0000-4000-8000-000000000003';
let db: PGlite;

describe('Récompenses et classements par espèce unique — PostgreSQL', () => {
  beforeAll(async () => {
    db = new PGlite({ fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob });
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role' $$;
      CREATE FUNCTION public.is_staff(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE FUNCTION public.is_premium(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE TABLE public.profiles(user_id uuid,display_name text,username text,avatar_url text,is_private boolean DEFAULT false);
      CREATE TABLE public.explorer_follows(follower_id uuid,following_id uuid,status text);
      CREATE TABLE public.animal_departments(animal_name text,department_code text);
      CREATE TABLE public.captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,
        animal_name text,scientific_name text,category text DEFAULT 'Mammifères',status text DEFAULT 'approved',
        rarity text DEFAULT 'common',created_at timestamptz DEFAULT now(),xp_awarded boolean DEFAULT false,economy_validation_id uuid);
      CREATE TABLE public.capture_validations(id uuid,user_id uuid,source text,revoked_at timestamptz,
        consumed_at timestamptz,expires_at timestamptz,capture_id uuid,animal_name text,scientific_name text);
      CREATE TABLE public.test_xp(user_id uuid,amount integer);
      CREATE FUNCTION public.grant_xp(uuid,integer) RETURNS void LANGUAGE sql AS $$ INSERT INTO public.test_xp VALUES($1,$2) $$;
      CREATE TABLE public.league_groups(id uuid,week_start date,tier smallint);
      CREATE TABLE public.league_members(group_id uuid,user_id uuid,points integer,created_at timestamptz DEFAULT now());
      CREATE FUNCTION public.league_current_group(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${group}'::uuid $$;
      CREATE FUNCTION public.xp_leaderboard(integer,text,text) RETURNS TABLE(rank bigint,user_id uuid,display_name text,
        username text,avatar_url text,xp bigint,is_me boolean,total_players bigint) LANGUAGE sql AS $$
        SELECT 1::bigint,p.user_id,p.display_name,p.username,p.avatar_url,50::bigint,p.user_id=auth.uid(),1::bigint FROM public.profiles p $$;
    `);
    // Load real preceding definitions, then apply the same migration as production.
    const names = new Set(['xp_on_capture', 'category_leaderboard', 'my_category_rank',
      'category_leaderboard_with_movement', 'my_category_rank_with_movement',
      'territory_leaderboard', 'my_territory_rank', 'xp_leaderboard_v2', 'league_board']);
    const definitions = new Map<string, string>();
    for (const file of readdirSync('drizzle/migrations').filter(f => f.endsWith('.sql')).sort()) {
      if (file.startsWith('0159_')) break;
      const sql = readFileSync(`drizzle/migrations/${file}`, 'utf8');
      const pattern = /create (?:or replace )?function public\.(\w+)\s*\([\s\S]*?\bas\s+(\$\w*\$)[\s\S]*?\2\s*;/gi;
      for (const match of sql.matchAll(pattern)) {
        if (names.has(match[1])) definitions.set(match[1], match[0]);
      }
    }
    expect(definitions.size).toBe(9);
    for (const definition of definitions.values()) await db.exec(definition);
    await db.exec(readFileSync('drizzle/migrations/0159_unique_species_capture_rewards_and_rankings.sql', 'utf8'));
    await db.exec('CREATE TRIGGER reward BEFORE INSERT OR UPDATE ON public.captures FOR EACH ROW EXECUTE FUNCTION public.xp_on_capture();');
  }, 60_000);

  beforeEach(async () => {
    await db.exec(`TRUNCATE captures,test_xp,profiles,animal_departments,league_groups,league_members;
      INSERT INTO profiles(user_id,username) VALUES('${owner}','owner'),('${other}','other');
      INSERT INTO league_groups VALUES('${group}',date_trunc('week',now())::date,1);
      INSERT INTO league_members(group_id,user_id,points) VALUES('${group}','${owner}',50);`);
  });
  afterAll(async () => { await db?.close(); });

  const capture = (name: string, time = 'now()', user = owner, status = 'approved', scientific = 'Vulpes vulpes') =>
    db.query(`INSERT INTO captures(user_id,animal_name,scientific_name,created_at,status) VALUES($1,$2,$3,${time},$4) RETURNING id`, [user, name, scientific, status]);
  const result = async (sql: string) => (await db.query<Record<string, number>>(sql)).rows[0];

  it('accorde 0 XP aux deuxième et troisième photos, même après une mise à jour', async () => {
    await capture('Renard roux');
    await capture('Renard roux');
    await capture(' RENARD ROUX ');
    await db.exec("UPDATE captures SET xp_awarded=false WHERE animal_name='Renard roux';");
    expect(await result('SELECT sum(amount)::int AS xp,count(*)::int AS rewards FROM test_xp')).toEqual({ xp: 50, rewards: 1 });
    expect(await result('SELECT count(*)::int AS settled FROM captures WHERE xp_awarded')).toEqual({ settled: 3 });
  });

  it('compte une seule espèce dans le classement et dans mon rang', async () => {
    await capture('Renard roux'); await capture('Renard roux');
    await capture('Renard roux', 'now()', other); await capture('Loup gris', 'now()', other);
    const top = await db.query<{user_id: string; captures: number; rank: number}>("SELECT user_id,captures::int,rank::int FROM category_leaderboard_with_movement('all',20,'global','all')");
    expect(top.rows).toEqual([{user_id: other,captures: 2,rank: 1},{user_id: owner,captures: 1,rank: 2}]);
    for (const fn of ['my_category_rank', 'my_category_rank_with_movement']) {
      expect(await result(`SELECT captures::int,rank::int FROM ${fn}('all','global','all')`)).toEqual({captures: 1,rank: 2});
    }
  });

  it('ne compte pas cette semaine une nouvelle photo d’une espèce acquise auparavant', async () => {
    await capture('Renard roux', "now()-interval '20 days'"); await capture('Renard roux'); await capture('Loup gris');
    for (const fn of ['category_leaderboard', 'category_leaderboard_with_movement']) {
      expect(await result(`SELECT captures::int FROM ${fn}('all',20,'global','week')`)).toEqual({captures: 1});
    }
    expect(await result("SELECT captures::int FROM xp_leaderboard_v2(20,'global','week') WHERE is_me")).toEqual({captures: 1});
    expect(await result('SELECT captures FROM league_board() WHERE is_me')).toEqual({captures: 1});
  });

  it('conserve les races distinctes partageant le même nom scientifique', async () => {
    await capture('Berger allemand', 'now()', owner, 'approved', 'Canis lupus familiaris');
    await capture('Golden retriever', 'now()', owner, 'approved', 'Canis lupus familiaris');
    await capture('Berger allemand', 'now()', owner, 'approved', 'Canis lupus familiaris');
    expect(await result("SELECT captures::int FROM category_leaderboard('Mammifères',20,'global','all')")).toEqual({captures: 2});
    expect(await result('SELECT sum(amount)::int AS xp FROM test_xp')).toEqual({xp: 100});
  });

  it('ignore une photo non approuvée pour la première découverte', async () => {
    await capture('Renard roux', "now()-interval '20 days'", owner, 'pending_review');
    await capture('Renard roux');
    expect(await result("SELECT captures::int FROM category_leaderboard('all',20,'global','week')")).toEqual({captures: 1});
    expect(await result('SELECT sum(amount)::int AS xp FROM test_xp')).toEqual({xp: 50});
  });

  it('garde le mouvement à zéro si seules des photos répétées ont été ajoutées depuis hier', async () => {
    await capture('Renard roux', "now()-interval '2 days'"); await capture('Renard roux');
    for (const fn of ['category_leaderboard_with_movement', 'my_category_rank_with_movement']) {
      const args = fn.startsWith('my_') ? "'all','global','all'" : "'all',20,'global','all'";
      expect(await result(`SELECT captures::int,rank_change::int FROM ${fn}(${args})`)).toEqual({captures: 1,rank_change: 0});
    }
  });

  it('compte aussi les espèces uniques dans le classement territorial', async () => {
    await db.exec("INSERT INTO animal_departments VALUES('Renard roux','75');");
    await capture('Renard roux'); await capture('Renard roux');
    expect(await result("SELECT captures::int FROM territory_leaderboard('75',20,'global')")).toEqual({captures: 1});
    expect(await result("SELECT captures::int FROM my_territory_rank('75','global')")).toEqual({captures: 1});
  });
});