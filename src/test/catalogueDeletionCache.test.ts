import { expect, it } from 'vitest';
import { readCatalogueCache, writeCatalogueCache, removeCatalogueEntry, subscribeCatalogueDeletion } from '@/lib/bestiaryCache';

it('deletion updates the cached catalogue and mounted listeners', () => {
  writeCatalogueCache([{name:'Lion',scientific_name:'Panthera leo',rarity:'rare',category:'Mammifères'}, {name:'Tigre',scientific_name:'Panthera tigris',rarity:'rare',category:'Mammifères'}],2);
  const removed: string[] = [];
  const unsubscribe = subscribeCatalogueDeletion((name) => removed.push(name));
  removeCatalogueEntry('Lion');
  expect(readCatalogueCache()?.entries.map((entry) => entry.name)).toEqual(['Tigre']);
  expect(readCatalogueCache()?.count).toBe(1);
  expect(removed).toEqual(['Lion']);
  unsubscribe();
});