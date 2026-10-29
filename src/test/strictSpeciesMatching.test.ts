// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
let db:PGlite;
const sql=()=>readFileSync(process.env.SPECIES_MATCHING_SQL ?? 'drizzle/migrations/0083_strict_species_matching.sql','utf8');
const match=(name:string,sci:string|null=null)=>db.query<{name:string}>(`SELECT name FROM match_animal($1,$2)`,[name,sci]);
describe('Unified species identity matching',()=>{
 beforeAll(async()=>{
  db=new PGlite({fsBundle:new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob});
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE FUNCTION normalize_animal_label(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT nullif(regexp_replace(lower(translate(coalesce($1,''),'àâéèêëîïôöùûüç','aaeeeeiioouuuc')),'[^a-z0-9]+',' ','g'),'') $$;
   CREATE FUNCTION strip_label_parenthetical(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace($1,'\\s*\\([^)]*\\)','','g') $$;
   CREATE FUNCTION canonical_animal_name(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
   CREATE TABLE animals(id uuid DEFAULT gen_random_uuid(),name text,scientific_name text,category text,rarity text,taxon_id uuid);
   CREATE TABLE taxa(id uuid,vernacular_name text,scientific_name text,status text,is_domestic boolean,rank text,merged_into uuid);
   CREATE TABLE taxon_synonyms(taxon_id uuid,label text);
   CREATE TABLE captures(animal_name text,scientific_name text);`);
  await db.exec(readFileSync('supabase/migrations/20260908082843_771264e2-6ac5-42ba-a91c-15e17e946494.sql','utf8').split('-- Nom commun canonique')[0]);
  await db.exec(readFileSync('drizzle/migrations/0019_plural_tolerant_species_match.sql','utf8').split('CREATE OR REPLACE FUNCTION public.resolve_species_identity_plural')[0]);
  await db.exec(sql());
  await db.exec(`INSERT INTO animals(name,scientific_name) VALUES ('Gypaète barbu','Gypaetus barbatus'),('Criquet des ajoncs','Chorthippus binotatus'),('Criquet verdelet','Omocestus viridulus'),('Labrador','Canis lupus familiaris'),('Berger allemand','Canis lupus familiaris'),('Oiseau alpha',NULL),('Oiseau alpho',NULL);
   CREATE TRIGGER enforce_name BEFORE INSERT ON captures FOR EACH ROW EXECUTE FUNCTION enforce_canonical_animal_name();`);
 });
 afterAll(async()=>{await db.close()});
 it.each(['Gypaete barbu','Gypaète-barbu','Gypaetes barbus','Gypaète brabu','Gypaète barbuq','Hypaète barbu'])('canonicalizes the spelling %s',async name=>expect((await match(name)).rows).toEqual([{name:'Gypaète barbu'}]));
 it('uses the safe scientific identity for a synonym',async()=>expect((await match('Vautour barbu','Gypaetus barbatus')).rows).toEqual([{name:'Gypaète barbu'}]));
 it('does not match different scientific species by similar common names',async()=>expect((await match('Criquet des ajonc','Omocestus viridulus')).rows).toEqual([{name:'Criquet verdelet'}]));
 it('rejects an exact common name with a contradictory scientific identity',async()=>{await expect(match('Criquet des ajoncs','Omocestus viridulus')).rejects.toThrow('SPECIES_IDENTITY_CONFLICT')});
 it('never resolves a shared binomial to a random domestic breed',async()=>expect((await match('Caniche','Canis lupus familiaris')).rows).toEqual([]));
 it('corrects an unambiguous typo within a breed',async()=>expect((await match('Labrado','Canis lupus familiaris')).rows).toEqual([{name:'Labrador'}]));
 it('refuses equally close candidates instead of creating another tile',async()=>{await expect(match('Oiseau alphi')).rejects.toThrow('AMBIGUOUS_SPECIES')});
 it('canonicalizes an inserted capture without plural conflict bypass',async()=>{await db.query(`INSERT INTO captures VALUES ('Gypaete brabu','Gypaetus barbatus')`); expect((await db.query('SELECT * FROM captures')).rows).toEqual([{animal_name:'Gypaète barbu',scientific_name:'Gypaetus barbatus'}]); await expect(db.query(`INSERT INTO captures VALUES ('Criquets des ajoncs','Unknown species')`)).resolves.toBeDefined(); expect((await db.query(`SELECT scientific_name FROM captures WHERE animal_name='Criquets des ajoncs'`)).rows).toEqual([{scientific_name:'Unknown species'}]);});
 it('does not insert a spelling variant into the catalogue',async()=>{await db.query(`INSERT INTO animals(name,scientific_name) VALUES ('Gypaète brabu','Gypaetus barbatus')`); expect((await db.query(`SELECT count(*)::int AS count FROM animals WHERE scientific_name='Gypaetus barbatus'`)).rows).toEqual([{count:1}]);});
});