import { describe, it, expect } from 'vitest';
import { needsDeepPass, isVagueTaxon } from '../../supabase/functions/_shared/visual-identification-policy';

describe('seconde analyse forte', () => {
  it('se lance sous 70 de confiance, quel que soit l’animal', () => {
    expect(needsDeepPass({ animal_name: 'Renard roux', scientific_name: 'Vulpes vulpes', confidence: 65 })).toBe(true);
  });
  it('ne se lance pas sur une espèce précise et sûre', () => {
    expect(needsDeepPass({ animal_name: 'Renard roux', scientific_name: 'Vulpes vulpes', confidence: 90 })).toBe(false);
  });
  it('se lance sur un nom vague (genre ou famille) sous 85', () => {
    expect(isVagueTaxon('Salticidae')).toBe(true);
    expect(needsDeepPass({ animal_name: 'Araignée sauteuse', scientific_name: 'Salticidae', confidence: 80 })).toBe(true);
  });
  it('se lance sur une araignée sous 80', () => {
    expect(needsDeepPass({ animal_name: 'Araignée domestique tropicale', scientific_name: 'Heteropoda venatoria', confidence: 75 })).toBe(true);
  });
});
