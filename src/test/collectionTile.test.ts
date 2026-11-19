import { describe, expect, it } from 'vitest';
import { findCollectionTile } from '@/lib/collectionTile';

const animals = [
  { name: 'Abondance', scientific_name: 'Bos taurus' },
  { name: 'Salers', scientific_name: 'Bos taurus' },
  { name: 'Schipperke', scientific_name: 'Canis lupus familiaris' },
  { name: 'Beagle', scientific_name: 'Canis lupus familiaris' },
  { name: 'Harfang des neiges', scientific_name: 'Bubo scandiacus' },
];

describe('findCollectionTile', () => {
  it('shows the breed the explorer added, not another breed with the same binomial', () => {
    expect(findCollectionTile(animals, 'Salers', 'Bos taurus')?.name).toBe('Salers');
    expect(findCollectionTile(animals, 'Beagle', 'Canis lupus familiaris')?.name).toBe('Beagle');
  });

  it('uses the scientific name only when it points to a single tile', () => {
    expect(findCollectionTile(animals, 'Chouette harfang', 'Bubo scandiacus')?.name).toBe('Harfang des neiges');
    expect(findCollectionTile(animals, 'Vache inconnue', 'Bos taurus')).toBeUndefined();
  });
});
