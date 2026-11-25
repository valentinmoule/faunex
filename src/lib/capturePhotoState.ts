import type { AnimalCard } from '@/data/mockData';
import type { BestiaryAnimal } from '@/lib/bestiary';

/** Removing one photo keeps its species captured while another photo remains. */
export function removeCollectionPhoto(animals: BestiaryAnimal[], captures: AnimalCard[], captureId: string, replacement?: AnimalCard) {
  const filtered = captures.filter(capture => capture.id !== captureId);
  const remaining = replacement && !filtered.some(c => c.id === replacement.id) ? [...filtered, replacement] : filtered;
  const latest = new Map<string, AnimalCard>();
  for (const capture of remaining) {
    const key = capture.name.trim().toLocaleLowerCase('fr');
    const previous = latest.get(key);
    if (!previous || +new Date(capture.discoveredAt || 0) > +new Date(previous.discoveredAt || 0)) latest.set(key, capture);
  }
  return {
    captures: remaining,
    animals: animals.map(animal => {
      if (animal.captureData?.id !== captureId) return animal;
      const replacement = latest.get(animal.name.trim().toLocaleLowerCase('fr'));
      return { ...animal, captured: !!replacement, captureData: replacement };
    }),
  };
}