// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002', r='00000000-0000-0000-0000-000000000003';
let db:PGlite;
const call=(action:string,value:string='',target:string=b)=>db.query(`SELECT admin_reported_species_action(ARRAY['${r}'::uuid],'${a}','Source','Source sci','${action}','${value}','${target}')`);
describe('Reported species mutations',()=>{
 beforeAll(async()=>{
  db=new PGlite({fsBundle:new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob});
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${a}'::uuid $$;
  CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.role',true)=$2 $$;
  CREATE FUNCTION normalize_animal_label(text) RETURNS text LANGUAGE sql AS $$ SELECT lower($1) $$;
  CREATE TABLE animals(id uuid primary key,name text,scientific_name text,taxon_id uuid);
  CREATE TABLE captures(id uuid primary key,user_id uuid,animal_name text,scientific_name text,taxon_id uuid,image_url text,status text,xp integer);
  CREATE UNIQUE INDEX capture_unique ON captures(user_id,lower(animal_name)) WHERE status='approved';
  CREATE TABLE species_reports(id uuid primary key,user_id uuid,species_name text,scientific_name text,status text);
  CREATE TABLE catalogue_update_snapshots(batch_key text,relation_name text,row_key text,row_data jsonb);
  CREATE TABLE species_profiles(id uuid,animal_name text,normalized_name text,scientific_name text,normalized_scientific text,description_en text,habitat_en text,diet_en text,fun_fact_en text,translated_en_at timestamptz,updated_at timestamptz);
  CREATE TABLE animal_merge_map(old_name text primary key,new_name text,mode text);
  CREATE TABLE taxa(id uuid,vernacular_name text,scientific_name text,updated_at timestamptz,merged_into uuid,collectible boolean,status text);
  CREATE TABLE species_natural_history(animal_id uuid);
  CREATE TABLE collection_taxa(collection_id uuid,taxon_id uuid,is_core boolean,created_at timestamptz,UNIQUE(collection_id,taxon_id));
  CREATE TABLE animal_departments(animal_name text,department_code text,created_at timestamptz,taxon_id uuid,UNIQUE(animal_name,department_code));
  CREATE TABLE eclats_species_redirects(old_animal_id uuid primary key,new_animal_id uuid,reason text);
  CREATE TABLE ml_dataset_events(animal_id uuid,taxon_id uuid);
  CREATE TABLE custom_collection_items(id uuid,collection_id uuid,animal_name text,scientific_name text);
  CREATE TABLE themed_collections(species_names text[]);
  CREATE TABLE species_pages(animal_name text,scientific_name text,published boolean,updated_at timestamptz);`);
  await db.exec(readFileSync('drizzle/migrations/0082_reported_species_actions.sql','utf8'));
  await db.exec(readFileSync('drizzle/migrations/0084_keep_species_reports_open_until_validation.sql','utf8'));
 });
 afterAll(async()=>{await db.close()});
 beforeEach(async()=>{await db.exec(`TRUNCATE animals,captures,species_reports,catalogue_update_snapshots,species_profiles,animal_merge_map,taxa,species_natural_history,collection_taxa,animal_departments,eclats_species_redirects,ml_dataset_events,custom_collection_items,themed_collections,species_pages; SET test.role='admin';
 INSERT INTO animals VALUES('${a}','Source','Source sci',null),('${b}','Target','Target sci',null);
 INSERT INTO species_reports VALUES('${r}','${a}','Source','Source sci','pending');
 INSERT INTO captures VALUES('${a}','${a}','Source','Source sci',null,'photo.jpg','approved',25);
 INSERT INTO themed_collections VALUES(ARRAY['Source','Target']);`)});
 it('changes the common name and keeps scientific name, photo and XP',async()=>{
  await call('vernacular','Renamed');
  expect((await db.query('SELECT animal_name,scientific_name,image_url,xp FROM captures')).rows).toEqual([{animal_name:'Renamed',scientific_name:'Source sci',image_url:'photo.jpg',xp:25}]);
  expect((await db.query('SELECT status FROM species_reports')).rows).toEqual([{status:'pending'}]);
 });
 it('changes the scientific name without changing common name or photo',async()=>{
  await call('scientific','Correct sci');
  expect((await db.query('SELECT animal_name,scientific_name,image_url FROM captures')).rows).toEqual([{animal_name:'Source',scientific_name:'Correct sci',image_url:'photo.jpg'}]);
 });
 it('merges into the chosen target while preserving the personal photo and XP',async()=>{
  await call('merge');
  expect((await db.query('SELECT name FROM animals')).rows).toEqual([{name:'Target'}]);
  expect((await db.query('SELECT id,animal_name,scientific_name,image_url,xp FROM captures')).rows).toEqual([{id:a,animal_name:'Target',scientific_name:'Target sci',image_url:'photo.jpg',xp:25}]);
  expect((await db.query('SELECT species_names FROM themed_collections')).rows).toEqual([{species_names:['Target']}]);
  expect((await db.query('SELECT species_name,status FROM species_reports')).rows).toEqual([{species_name:'Target',status:'pending'}]);
 });
 it('allows successive common and scientific corrections before explicit validation',async()=>{
  await call('vernacular','Renamed');
  await db.query(`SELECT admin_reported_species_action(ARRAY[$1::uuid],$2::uuid,'Renamed','Source sci','scientific','Correct sci',NULL)`,[r,a]);
  expect((await db.query('SELECT species_name,scientific_name,status FROM species_reports')).rows).toEqual([{species_name:'Renamed',scientific_name:'Correct sci',status:'pending'}]);
  await db.query(`UPDATE species_reports SET status='resolved' WHERE id=$1`,[r]);
  expect((await db.query('SELECT status FROM species_reports')).rows).toEqual([{status:'resolved'}]);
 });
 it('keeps the acting report pending when merging two reports from the same user',async()=>{
  await db.query(`INSERT INTO species_reports VALUES($1,$2,'Target','Target sci','pending')`,[b,a]);
  await call('merge');
  expect((await db.query('SELECT id,status FROM species_reports ORDER BY id')).rows).toEqual([{id:b,status:'dismissed'},{id:r,status:'pending'}]);
 });
 it('refuses merge when an owner has both photos and rolls back',async()=>{
  await db.exec(`INSERT INTO captures VALUES('${b}','${a}','Target','Target sci',null,'other.jpg','approved',30)`);
  await expect(call('merge')).rejects.toThrow('MERGE_CAPTURE_CONFLICT');
  expect((await db.query('SELECT image_url FROM captures ORDER BY id')).rows).toEqual([{image_url:'photo.jpg'},{image_url:'other.jpg'}]);
  expect((await db.query('SELECT status FROM species_reports')).rows).toEqual([{status:'pending'}]);
 });
 it('rejects a non-admin',async()=>{await db.exec("SET test.role='user'");await expect(call('scientific','Correct')).rejects.toMatchObject({code:'42501'})});
 it('rejects a name occupied by another entry',async()=>{await expect(call('vernacular','Target')).rejects.toThrow('NAME_EXISTS')});
});
