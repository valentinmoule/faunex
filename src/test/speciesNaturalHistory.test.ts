import { describe, expect, it } from 'vitest';
import { exactTaxonomy, extractMeasurements } from '../../supabase/functions/species-natural-history/policy';

describe('species natural history', () => {
  it('returns all four requested ranks only for the exact species', () => {
    expect(exactTaxonomy({ matchType: 'EXACT', kingdom: 'Animalia', rank: 'SPECIES', canonicalName: 'Parus major', phylum: 'Chordata', class: 'Aves', order: 'Passeriformes', family: 'Paridae', usageKey: 9705453 }, 'Parus major')).toEqual({ phylum: 'Chordata', class_name: 'Aves', order_name: 'Passeriformes', family: 'Paridae', gbif_key: 9705453 });
  });
  it('never substitutes a related species', () => {
    expect(exactTaxonomy({ matchType: 'EXACT', kingdom: 'Animalia', rank: 'SPECIES', canonicalName: 'Chrysiptera parasema' }, 'Chrysiptera hemicyanea')).toBeNull();
  });
  it('uses a published average rather than an invented midpoint', () => {
    expect(extractMeasurements('<dt>Range mass</dt><dd>10 to 20 g</dd><dt>Average mass</dt><dd>13 g</dd>')).toEqual({ weight: { value: '13 g', kind: 'average' } });
  });
  it('labels a published range as a range, not an average', () => {
    expect(extractMeasurements('<dt>Range length</dt><dd>2.4 to 3.3 m</dd>')).toEqual({ size: { value: '2.4 to 3.3 m', kind: 'range' } });
  });
  it('leaves unknown metrics absent rather than extracting arbitrary prose', () => {
    expect(extractMeasurements('<p>Young animals weigh 12 kg. Wingspan 200 cm.</p><dt>Average mass</dt><dd>30 lb</dd>')).toEqual({});
  });
});