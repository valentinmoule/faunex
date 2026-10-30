import { describe, expect, it } from 'vitest';
import { scientificOnlyOverride } from '../../supabase/functions/_shared/forced-identification';

describe('forced scientific-only corrections', () => {
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