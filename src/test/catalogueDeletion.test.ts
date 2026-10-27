// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

describe('Catalogue deletion server authorization', () => {
  let db: PGlite;
  beforeEach(async () => {
    db = new PGlite({ fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob });
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $2 = current_setting('test.role',true) $$;
      CREATE TABLE public.animals(id uuid PRIMARY KEY,name text,scientific_name text);
      CREATE TABLE public.species_pages(animal_name text,published boolean);
      CREATE TABLE public.captures(id integer,animal_name text,image_url text);
      INSERT INTO animals VALUES ('00000000-0000-0000-0000-000000000001','Lion','Panthera leo');
      INSERT INTO species_pages VALUES ('Lion',true);
      INSERT INTO captures VALUES (1,'Lion','personal-photo.jpg');
    `);
    await db.exec(readFileSync('drizzle/migrations/0079_admin_delete_bestiary_species.sql','utf8'));
  });
  afterEach(async () => { await db.close(); });

  it.each(['admin','moderator'])('%s can delete a catalogue entry without deleting personal photos', async (role) => {
    await db.exec(`SET test.uid='00000000-0000-0000-0000-000000000002'; SET test.role='${role}'; SET ROLE authenticated;`);
    expect((await db.query<{deleted:boolean}>(`SELECT public.admin_delete_bestiary_species('Lion','Panthera leo') AS deleted`)).rows[0].deleted).toBe(true);
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT * FROM animals')).rows).toHaveLength(0);
    expect((await db.query('SELECT published FROM species_pages')).rows).toEqual([{published:false}]);
    expect((await db.query('SELECT * FROM captures')).rows).toEqual([{id:1,animal_name:'Lion',image_url:'personal-photo.jpg'}]);
  });
  it('ordinary authenticated users cannot delete species', async () => {
    await db.exec(`SET test.uid='00000000-0000-0000-0000-000000000002'; SET test.role='user'; SET ROLE authenticated;`);
    await expect(db.query(`SELECT public.admin_delete_bestiary_species('Lion','Panthera leo')`)).rejects.toMatchObject({code:'42501'});
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT * FROM animals')).rows).toHaveLength(1);
  });
  it('anonymous users cannot execute deletion', async () => {
    await db.exec('SET ROLE anon');
    await expect(db.query(`SELECT public.admin_delete_bestiary_species('Lion','Panthera leo')`)).rejects.toMatchObject({code:'42501'});
  });
  it('scientific identity mismatch never deletes a different species', async () => {
    await db.exec(`SET test.uid='00000000-0000-0000-0000-000000000002'; SET test.role='admin';`);
    expect((await db.query<{deleted:boolean}>(`SELECT public.admin_delete_bestiary_species('Lion','Panthera tigris') AS deleted`)).rows[0].deleted).toBe(false);
    expect((await db.query('SELECT * FROM animals')).rows).toHaveLength(1);
  });
});
