import { describe, expect, it } from 'vitest';
import { isSpeciesBinomial } from '@/lib/sharedBinomials';

describe('races domestiques : même nom scientifique ≠ doublon', () => {
  it('le canari domestique ne sert jamais de clé de doublon', () => {
    expect(isSpeciesBinomial('Serinus canaria domestica')).toBe(false);
    expect(isSpeciesBinomial('Serinus canaria domestica "Gloster"')).toBe(false);
  });

  it('toute forme domestique (domesticus/domestica/familiaris) est partagée', () => {
    expect(isSpeciesBinomial('Bombyx mori domesticus')).toBe(false);
    expect(isSpeciesBinomial('Canis lupus familiaris')).toBe(false);
  });

  it('une espèce sauvage reste une clé de doublon', () => {
    expect(isSpeciesBinomial('Cyanistes caeruleus')).toBe(true);
    expect(isSpeciesBinomial('Balearica regulorum')).toBe(true);
  });
});
