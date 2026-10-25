import { describe, expect, it } from 'vitest';
import { exactTaxonomy, extractMeasurements, parseEstimatedMeasurements } from '../../supabase/functions/species-natural-history/policy';

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
describe('AI measurement estimates', () => {
  it('keeps strict metric estimates labelled as estimates', () => {
    expect(parseEstimatedMeasurements('{"size":"12 cm","weight":"20 to 45 g"}')).toEqual({ size: { value: '12 cm', kind: 'estimate' }, weight: { value: '20 to 45 g', kind: 'estimate' } });
  });
  it('accepts markdown-fenced JSON', () => {
    expect(parseEstimatedMeasurements('```json\n{"size":"1.5 m","weight":null}\n```')).toEqual({ size: { value: '1.5 m', kind: 'estimate' } });
  });
  it('drops prose, imperial units and invalid JSON', () => {
    expect(parseEstimatedMeasurements('{"size":"about 12 cm","weight":"30 lb"}')).toEqual({});
    expect(parseEstimatedMeasurements('The fox is 60 cm long')).toEqual({});
  });
});
