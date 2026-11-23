import { describe, expect, it } from 'vitest';
import { buildFavoriteSpeciesKeys, speciesFavoriteKey } from '@/hooks/useSpeciesFavorites';

describe('Favoris du Bestiaire', () => {
  it('garde une espèce non capturée mise en favori', () => {
    const keys = buildFavoriteSpeciesKeys(['Lynx boréal'], [], new Set());
    expect(keys.has(speciesFavoriteKey('Lynx boréal'))).toBe(true);
  });

  it("ajoute l'espèce d'une capture marquée, pas celle d'une capture non marquée", () => {
    const captures = [
      { id: 'c1', name: 'Renard roux' },
      { id: 'c2', name: 'Mésange bleue' },
    ];
    const keys = buildFavoriteSpeciesKeys([], captures, new Set(['c1']));
    expect(keys.has(speciesFavoriteKey('Renard roux'))).toBe(true);
    expect(keys.has(speciesFavoriteKey('Mésange bleue'))).toBe(false);
  });

  it('ignore la casse et les espaces autour du nom', () => {
    const keys = buildFavoriteSpeciesKeys(['  hérisson d’Europe '], [], new Set());
    expect(keys.has(speciesFavoriteKey('Hérisson d’Europe'))).toBe(true);
  });
});
