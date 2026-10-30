import { describe, expect, it } from 'vitest';
import { scientificOnlyOverride, applyForcedIdentity } from '../../supabase/functions/_shared/forced-identification';
import { isGenericDomesticChicken } from '../../supabase/functions/_shared/visual-identification-policy';
import { needsBreedClarification } from '../../supabase/functions/enrich-capture/moderator-notes';

describe('forced scientific-only corrections', () => {
  it('applies a forced race before testing the generic AI response', () => {
    const result = applyForcedIdentity({ animal_name: 'Poule domestique', breed_uncertain: true }, { forceName: true, commonName: 'Poule Marans', scientificName: 'Gallus gallus domesticus' });
    expect(result.animal_name).toBe('Poule Marans');
    expect(isGenericDomesticChicken(result.animal_name)).toBe(false);
    expect(needsBreedClarification(true, true, result)).toBe(false);
  });
  it('does not let forcing recreate a forbidden generic chicken tile', () => {
    const result = applyForcedIdentity({ animal_name: 'Poule Marans' }, { forceName: true, commonName: 'Poule et coq domestiques' });
    expect(isGenericDomesticChicken(result.animal_name)).toBe(true);
  });
  it('does not treat the previous capture name as an explicitly forced common name', () => {
    expect(scientificOnlyOverride({ force_name: true, scientific_name: 'Omocestus viridulus', animal_name: 'Criquet des ajoncs', common_name_supplied: false })).toBe(true);
  });
  it('keeps both explicitly provided names subject to conflict checks', () => {
    expect(scientificOnlyOverride({ force_name: true, scientific_name: 'Omocestus viridulus', animal_name: 'Criquet des ajoncs', common_name_supplied: true })).toBe(false);
  });
  it('supports scientific-only requests with no fallback common name', () => {
    expect(scientificOnlyOverride({ force_name: true, scientific_name: 'Gypaetus barbatus' })).toBe(true);
  });
  it('does not change non-forced identification or requests without a scientific name', () => {
    expect(scientificOnlyOverride({ force_name: false, scientific_name: 'Gypaetus barbatus', common_name_supplied: false })).toBe(false);
    expect(scientificOnlyOverride({ force_name: true, scientific_name: ' ', common_name_supplied: false })).toBe(false);
  });
});