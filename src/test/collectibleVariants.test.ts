// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { isSpeciesBinomial } from '@/lib/sharedBinomials';
let db: PGlite;
describe('Approved peacock variants', () => {
 beforeAll(async () => {
  db = new PGlite({fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob});
  await db.exec(`CREATE TABLE animals(name text,scientific_name text,created_at timestamptz DEFAULT now()); CREATE TABLE captures(animal_name text,scientific_name text);`);
  await db.exec(readFileSync('drizzle/migrations/0094_preserve_collectible_peacock_variants.sql','utf8'));
  const original = readFileSync('supabase/migrations/20260908082843_771264e2-6ac5-42ba-a91c-15e17e946494.sql','utf8');
  await db.exec(original.slice(original.indexOf('CREATE OR REPLACE FUNCTION public.catalogue_name_for_binomial')));
  await db.exec(`INSERT INTO animals(name,scientific_name) VALUES ('Paon bleu','Pavo cristatus'),('Paon blanc','Pavo cristatus'),('Paon nigripenne','Pavo cristatus'),('Paon panaché','Pavo cristatus');`);
 });
 afterAll(async () => { await db.close(); });
 it('does not treat Pavo cristatus as a scientific-only duplicate key', () => {
  expect(isSpeciesBinomial('Pavo cristatus')).toBe(false);
  expect(isSpeciesBinomial('Pavo muticus')).toBe(true);
 });
 it('does not select the blue variant from the shared scientific name', async () => {
  expect((await db.query('SELECT catalogue_name_for_binomial($1) name',['Pavo cristatus'])).rows).toEqual([{name:null}]);
 });
 it.each(['Paon bleu','Paon blanc','Paon nigripenne','Paon panaché'])('preserves %s through the capture naming trigger', async name => {
  await db.query('INSERT INTO captures VALUES ($1,$2)',[name,'Pavo cristatus']);
  expect((await db.query('SELECT animal_name FROM captures WHERE animal_name=$1',[name])).rows).toEqual([{animal_name:name}]);
 });
});