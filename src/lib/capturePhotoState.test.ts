import { describe, expect, it } from 'vitest';
import type { AnimalCard } from '@/data/mockData';
import type { BestiaryAnimal } from '@/lib/bestiary';
import { removeCollectionPhoto } from './capturePhotoState';

const photo = (id: string, date: string, name = 'Lapin domestique') => ({ id, name, discoveredAt: date, image: `/${id}.jpg`, scientificName: 'Oryctolagus cuniculus' }) as AnimalCard;
const newest = photo('newest', '2026-11-25');
const older = photo('older', '2026-11-24');
const oldest = photo('oldest', '2026-11-23');
const animal = { name: newest.name, captured: true, captureData: newest } as BestiaryAnimal;

describe('Actions on one species photo', () => {
  it('removes only the selected photo and replaces the tile with the latest remaining one', () => {
    const result = removeCollectionPhoto([animal], [oldest, newest, older], 'newest');
    expect(result.captures.map(c => c.id)).toEqual(['oldest', 'older']);
    expect(result.animals[0].captured).toBe(true);
    expect(result.animals[0].captureData?.id).toBe('older');
  });
  it('keeps the displayed tile unchanged when an older photo is released', () => {
    const result = removeCollectionPhoto([animal], [newest, older], 'older');
    expect(result.animals[0]).toBe(animal);
    expect(result.captures.map(c => c.id)).toEqual(['newest']);
  });
  it('marks only the species without any remaining photo as uncaptured', () => {
    const other = photo('other', '2026-11-24', 'Lapin bélier');
    const otherAnimal = { name: other.name, captured: true, captureData: other } as BestiaryAnimal;
    const result = removeCollectionPhoto([animal, otherAnimal], [newest, other], 'newest');
    expect(result.animals[0].captured).toBe(false);
    expect(result.animals[0].captureData).toBeUndefined();
    expect(result.animals[1]).toBe(otherAnimal);
  });
});