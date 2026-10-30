// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, expect, it } from 'vitest';

let db: PGlite;
beforeEach(async () => {
  db = new PGlite({ fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob });
  await db.exec(`CREATE TABLE animals(name text); CREATE TABLE captures(animal_name text,scientific_name text,status text,image_url text);
    INSERT INTO captures VALUES ('Poule et coq domestiques','Gallus gallus domesticus','approved','original.jpg');`);
  await db.exec(readFileSync('drizzle/migrations/0089_block_generic_domestic_chicken_tiles.sql','utf8'));
});
afterEach(async () => { await db.close(); });
it('blocks recreation of Poule et coq domestiques', async () => {
  await expect(db.exec(`INSERT INTO animals VALUES ('Poule et coq domestiques')`)).rejects.toMatchObject({code:'23514'});
});
it('keeps the original photo when moving the generic identity to human review', async () => {
  expect((await db.query(`UPDATE captures SET status='pending_review' RETURNING status,image_url`)).rows).toEqual([{status:'pending_review',image_url:'original.jpg'}]);
  await expect(db.exec(`UPDATE captures SET status='approved'`)).rejects.toMatchObject({code:'23514'});
});
it('permits approval once a precise race is assigned', async () => {
  await db.exec(`UPDATE captures SET status='pending_review'; INSERT INTO animals VALUES ('Poule Marans');`);
  expect((await db.query(`UPDATE captures SET animal_name='Poule Marans',status='approved' RETURNING animal_name,image_url`)).rows).toEqual([{animal_name:'Poule Marans',image_url:'original.jpg'}]);
});