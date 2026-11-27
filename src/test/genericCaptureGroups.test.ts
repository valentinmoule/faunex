// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { isNonCollectibleGroupLabel, isReclassificationGroupLabel } from '../../supabase/functions/_shared/generic-capture-groups';

const owner = '00000000-0000-0000-0000-000000000001';
const capture = '00000000-0000-0000-0000-000000000002';
const target = '00000000-0000-0000-0000-000000000003';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite({ fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob });
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${owner}'::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT coalesce(current_setting('test.role',true),'authenticated')$$;
    CREATE FUNCTION public.is_staff(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('test.staff',true),'false')='true'$$;
    CREATE TABLE animals(id uuid PRIMARY KEY,name text,scientific_name text);
    CREATE TABLE profiles(user_id uuid PRIMARY KEY,xp integer,level integer);
    CREATE TABLE captures(id uuid PRIMARY KEY,user_id uuid,animal_name text,scientific_name text,status text,image_url text,xp_awarded boolean);
    CREATE TABLE catalogue_update_snapshots(batch_key text,relation_name text,row_key text,row_data jsonb,created_at timestamptz,PRIMARY KEY(batch_key,relation_name,row_key));
    INSERT INTO profiles VALUES('${owner}',3385,52);
    INSERT INTO animals VALUES('${target}','Fourmi rousse des bois','Formica rufa');
    INSERT INTO captures VALUES('${capture}','${owner}','Fourmi','Formica rufa','approved','photo-original.jpg',true);`);
  await db.exec(readFileSync('drizzle/migrations/0163_guard_generic_capture_groups_and_exact_reclassification.sql','utf8'));
});
afterAll(async () => { await db.close(); });

describe('first-wave generic groups', () => {
  it.each([
    ['Fourmi','Formicidae'], ['Fourmi ailée',null], ['Araignée','Araneae'],
    ['Araignée commune','Araneae'], ['Mouche','Brachycera'], ['Mouche commune','Muscidae'],
    ['Fourmi','Lasius niger'], ['Insecte','Formicidae sp.'],
  ])('refuses %s as a new collectible species', async (name,scientific) => {
    expect(isReclassificationGroupLabel(name,scientific)).toBe(true);
    const {rows} = await db.query<{group: boolean}>('SELECT public.is_reclassification_group_label($1,$2) AS "group"',[name,scientific]);
    expect(rows[0]?.group).toBe(true);
    await expect(db.query('INSERT INTO animals VALUES(gen_random_uuid(),$1,$2)',[name,scientific])).rejects.toMatchObject({code:'23514'});
  });
  it.each([
    ['Petite biche','Dorcus parallelipipedus'], ['Petite mouche domestique','Fannia canicularis'],
    ['Fourmi noire des jardins','Lasius niger'], ['Ver de terre commun','Lumbricus terrestris'],
    ['Cheval domestique','Equus caballus'], ['Paon blanc','Pavo cristatus'],
  ])('keeps the genuine tile %s', async (name,scientific) => {
    expect(isReclassificationGroupLabel(name,scientific)).toBe(false);
    const {rows} = await db.query<{group:boolean}>('SELECT public.is_reclassification_group_label($1,$2) AS "group"',[name,scientific]);
    expect(rows[0]?.group).toBe(false);
  });
  it('preserves the bee guard', () => {
    expect(isNonCollectibleGroupLabel('Bourdon','Bombus')).toBe(true);
    expect(isNonCollectibleGroupLabel('Bourdon terrestre','Bombus terrestris')).toBe(false);
  });
  it('keeps uncertain photos in review without deleting them', async () => {
    await db.exec(`INSERT INTO captures VALUES(gen_random_uuid(),'${owner}','Araignée','Araneae','pending_review','uncertain.jpg',false)`);
    await expect(db.exec("UPDATE captures SET status='approved' WHERE image_url='uncertain.jpg'")).rejects.toMatchObject({code:'23514'});
    const {rows} = await db.query("SELECT status,image_url FROM captures WHERE image_url='uncertain.jpg'");
    expect(rows).toEqual([{status:'pending_review',image_url:'uncertain.jpg'}]);
  });
  it('permits editing an existing generic photo without reclassifying it', async () => {
    await db.exec(`UPDATE captures SET image_url='photo-original.jpg' WHERE id='${capture}'`);
    const {rows} = await db.query(`SELECT animal_name FROM captures WHERE id='${capture}'`);
    expect(rows).toEqual([{animal_name:'Fourmi'}]);
  });
});

describe('exact historical reclassification', () => {
  it('refuses a non-staff caller', async () => {
    await db.exec("SELECT set_config('test.staff','false',false)");
    await expect(db.query('SELECT reclassify_exact_generic_capture($1,$2)',[capture,target])).rejects.toMatchObject({code:'42501'});
  });
  it('never replaces Formicidae with a guessed Formica rufa', async () => {
    await db.exec("SELECT set_config('test.staff','true',false)");
    const id = '00000000-0000-0000-0000-000000000004';
    // A historical group is inserted through the existing explicit staff bridge.
    await db.exec(`SELECT set_config('test.role','service_role',false); SELECT set_config('faunex.force_identity','on',false);
      INSERT INTO captures VALUES('${id}','${owner}','Fourmi','Formicidae','approved','unclear.jpg',true);
      SELECT set_config('faunex.force_identity','',false); SELECT set_config('test.role','authenticated',false);`);
    await expect(db.query('SELECT reclassify_exact_generic_capture($1,$2)',[id,target])).rejects.toMatchObject({code:'23514'});
  });
  it('keeps all photos and earned XP when an exact identity joins an existing tile', async () => {
    await db.exec(`INSERT INTO captures VALUES(gen_random_uuid(),'${owner}','Fourmi rousse des bois','Formica rufa','approved','second-photo.jpg',true)`);
    const {rows: before} = await db.query('SELECT count(*) AS count FROM captures');
    const {rows} = await db.query<{result:{result:string,name:string}}>('SELECT reclassify_exact_generic_capture($1,$2) AS result',[capture,target]);
    expect(rows[0]?.result).toMatchObject({result:'reclassified',name:'Fourmi rousse des bois'});
    const {rows: profile} = await db.query('SELECT xp,level FROM profiles');
    expect(profile).toEqual([{xp:3385,level:52}]);
    const {rows: after} = await db.query('SELECT count(*) AS count FROM captures');
    expect(after).toEqual(before);
    const {rows: photo} = await db.query(`SELECT image_url,xp_awarded FROM captures WHERE id='${capture}'`);
    expect(photo).toEqual([{image_url:'photo-original.jpg',xp_awarded:true}]);
    const {rows: snapshot} = await db.query(`SELECT row_data->>'animal_name' AS name FROM catalogue_update_snapshots WHERE relation_name='captures' AND row_key='${capture}'`);
    expect(snapshot).toEqual([{name:'Fourmi'}]);
    const {rows: repeat} = await db.query<{result:{result:string}}>('SELECT reclassify_exact_generic_capture($1,$2) AS result',[capture,target]);
    expect(repeat[0]?.result.result).toBe('already_applied');
  });
});