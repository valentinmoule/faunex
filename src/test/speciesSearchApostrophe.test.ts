import { describe, expect, it } from 'vitest';
import { normalizeSpeciesSearch } from '@/lib/bestiary';

// Le Bestiaire stocke « Cigale de l’orne » (apostrophe typographique). Un explorateur qui
// tape l'apostrophe droite de son clavier doit malgré tout tomber sur cette fiche.
const matches = (stored: string, query: string) =>
  normalizeSpeciesSearch(stored).includes(normalizeSpeciesSearch(query));

describe('Bestiary search tolerance', () => {
  it('finds the cicada entry whichever apostrophe is typed', () => {
    expect(matches('Cigale de l’orne', "cigale de l'orne")).toBe(true);
    expect(matches('Cigale de l’orne', 'cigale de l’orne')).toBe(true);
  });
  it('ignores accents, case and repeated spaces', () => {
    expect(matches('Cigale de l’orne', 'CIGALE  DE  L’ORNE')).toBe(true);
    expect(normalizeSpeciesSearch('  Cigale de l’Orne ')).toBe('cigale de l orne');
  });
  it('treats a hyphen like a space', () => {
    expect(matches('Paon-du-jour', 'paon du jour')).toBe(true);
  });
});
