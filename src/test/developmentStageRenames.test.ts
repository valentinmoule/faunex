// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let db: PGlite;
const cleanup = readFileSync('scripts/catalogue/development-stage-renames.sql', 'utf8');
describe('Nettoyage des stades avec le renommage réel', () => {
  beforeAll(async () => {
    db = new PGlite({ fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob });
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE animals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,scientific_name text,taxon_id uuid,name_en text);
      CREATE TABLE captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,animal_name text,scientific_name text,image_url text,status text,xp_awarded boolean);
      CREATE TABLE profiles(user_id uuid,level integer,xp integer);
      CREATE TABLE catalogue_update_snapshots(batch_key text,relation_name text,row_key text,row_data jsonb,created_at timestamptz DEFAULT now(),UNIQUE(batch_key,relation_name,row_key));
      CREATE TABLE taxa(id uuid,vernacular_name text,scientific_name text,updated_at timestamptz);
      CREATE TABLE species_profiles(id uuid,animal_name text,scientific_name text,normalized_name text);
      CREATE TABLE animal_merge_map(old_name text PRIMARY KEY,new_name text,mode text);
      CREATE TABLE custom_collection_items(id uuid,animal_name text,scientific_name text);
      CREATE TABLE animal_departments(animal_name text,department_code text,created_at timestamptz,taxon_id uuid,UNIQUE(animal_name,department_code));
      CREATE TABLE themed_collections(id uuid,species_names text[]);
      CREATE TABLE species_pages(slug text,animal_name text,scientific_name text,updated_at timestamptz);
      CREATE TABLE species_reports(id uuid,species_name text);
      CREATE FUNCTION normalize_animal_label(text) RETURNS text LANGUAGE sql AS $$ SELECT lower($1) $$;
    `);
    await db.exec(readFileSync('drizzle/migrations/0069_apply_approved_catalogue_rename.sql', 'utf8'));
    await db.exec(`
      INSERT INTO profiles VALUES('00000000-0000-4000-8000-000000000001',52,3385);
      INSERT INTO animals(name,scientific_name) VALUES
        ('Nymphe de Punaise verte du Sud','Nezara viridula'),
        ('Punaise verte','Palomena prasina'),
        ('Noctuelle de la patience','Euclidia mi'),
        ('Chenille de la Rouille','Acronicta rumicis'),
        ('Chenille indéterminée','Lepidoptera'),('Asticot','Musca domestica');
      INSERT INTO captures(user_id,animal_name,scientific_name,image_url,status,xp_awarded) VALUES
        ('00000000-0000-4000-8000-000000000001','Nymphe de Punaise verte du Sud','Nezara viridula','photo1','approved',true),
        ('00000000-0000-4000-8000-000000000001','Nymphe de Punaise verte du Sud','Nezara viridula','photo2','approved',true),
        ('00000000-0000-4000-8000-000000000001','Noctuelle de la patience','Acronicta rumicis','photo3','approved',true);
      INSERT INTO themed_collections VALUES(gen_random_uuid(),ARRAY['Nymphe de Punaise verte du Sud']);
    `);
    await db.exec(cleanup);
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('conserve toutes les photos et les 3385 XP du niveau 52', async () => {
    const photos = await db.query('SELECT animal_name,image_url,status,xp_awarded FROM captures ORDER BY image_url');
    expect(photos.rows).toEqual([
      { animal_name: 'Punaise verte du Sud', image_url: 'photo1', status: 'approved', xp_awarded: true },
      { animal_name: 'Punaise verte du Sud', image_url: 'photo2', status: 'approved', xp_awarded: true },
      { animal_name: 'Noctuelle de la patience', image_url: 'photo3', status: 'approved', xp_awarded: true },
    ]);
    expect((await db.query('SELECT level,xp FROM profiles')).rows).toEqual([{ level: 52, xp: 3385 }]);
    expect((await db.query('SELECT species_names FROM themed_collections')).rows).toEqual([{ species_names: ['Punaise verte du Sud'] }]);
  });

  it('ne fusionne ni Nezara avec Palomena ni Acronicta avec Euclidia', async () => {
    expect((await db.query("SELECT name,scientific_name FROM animals WHERE scientific_name IN ('Nezara viridula','Palomena prasina','Acronicta rumicis','Euclidia mi') ORDER BY scientific_name")).rows).toEqual([
      { name: 'Noctuelle de la patience', scientific_name: 'Acronicta rumicis' },
      { name: 'Mi', scientific_name: 'Euclidia mi' },
      { name: 'Punaise verte du Sud', scientific_name: 'Nezara viridula' },
      { name: 'Punaise verte', scientific_name: 'Palomena prasina' },
    ]);
  });

  it('laisse les larves génériques inchangées plutôt que deviner une espèce', async () => {
    expect((await db.query("SELECT name FROM animals WHERE name IN ('Chenille indéterminée','Asticot') ORDER BY name")).rows).toEqual([{ name: 'Asticot' },{ name: 'Chenille indéterminée' }]);
  });
});
