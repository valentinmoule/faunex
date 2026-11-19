// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isBeeGroupLabel } from '../../supabase/functions/_shared/visual-identification-policy';

describe('bees are only collectible as precise species', () => {
  it('flags genus, family and "sp." labels', () => {
    expect(isBeeGroupLabel('Bourdon', 'Bombus')).toBe(true);
    expect(isBeeGroupLabel('Abeille solitaire', 'Andrenidae')).toBe(true);
    expect(isBeeGroupLabel('Lasioglossum', 'Lasioglossum sp.')).toBe(true);
    expect(isBeeGroupLabel('Abeille sauvage', null)).toBe(true);
  });
  it('keeps species, subspecies and look-alike names', () => {
    expect(isBeeGroupLabel('Bourdon terrestre', 'Bombus terrestris')).toBe(false);
    expect(isBeeGroupLabel('Abeille noire', 'Apis mellifera mellifera')).toBe(false);
    expect(isBeeGroupLabel('Abeille charpentière', 'Xylocopa violacea')).toBe(false);
    expect(isBeeGroupLabel('Volucelle bourdon', 'Volucella bombylans')).toBe(false);
  });
});

let db: PGlite;
beforeEach(async () => {
  db = new PGlite({ fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob });
  await db.exec(`CREATE TABLE animals(name text, scientific_name text);
    CREATE TABLE captures(animal_name text, scientific_name text, status text, image_url text);
    INSERT INTO captures VALUES ('Bourdon','Bombus','pending_review','photo.jpg');`);
  await db.exec(readFileSync('drizzle/migrations/0123_bee_species_only.sql', 'utf8'));
});
afterEach(async () => { await db.close(); });

it('never creates a bee group tile', async () => {
  await expect(db.exec(`INSERT INTO animals VALUES ('Andrène','Andrena')`)).rejects.toMatchObject({ code: '23514' });
  await db.exec(`INSERT INTO animals VALUES ('Andrène fauve','Andrena fulva')`);
});
it('keeps a group-named bee photo in review until a species is chosen', async () => {
  await expect(db.exec(`UPDATE captures SET status='approved'`)).rejects.toMatchObject({ code: '23514' });
  const { rows } = await db.query(`UPDATE captures SET animal_name='Bourdon terrestre', scientific_name='Bombus terrestris', status='approved' RETURNING status, image_url`);
  expect(rows).toEqual([{ status: 'approved', image_url: 'photo.jpg' }]);
});
