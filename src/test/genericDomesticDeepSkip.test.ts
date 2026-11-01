import { describe, expect, it } from 'vitest';
import { isConfidentGenericDomestic } from '../../supabase/functions/_shared/visual-identification-policy';

const base = { is_real_photo: true, confidence: 50 };
describe('deep pass skip for generic domestic answers', () => {
  it('skips matching generic domestic names at confidence 45 or more', () => {
    expect(isConfidentGenericDomestic({ ...base, animal_name: 'Cheval domestique', scientific_name: 'Equus caballus' })).toBe(true);
    expect(isConfidentGenericDomestic({ ...base, animal_name: 'Chèvre domestique', scientific_name: 'Capra hircus', confidence: 45 })).toBe(true);
  });
  it('keeps the deep pass below 45 confidence', () => {
    expect(isConfidentGenericDomestic({ ...base, animal_name: 'Chien domestique', scientific_name: 'Canis lupus familiaris', confidence: 44 })).toBe(false);
  });
  it('keeps the deep pass when names disagree or a wild species is named', () => {
    expect(isConfidentGenericDomestic({ ...base, animal_name: 'Chien domestique', scientific_name: 'Canis lupus' })).toBe(false);
    expect(isConfidentGenericDomestic({ ...base, animal_name: 'Loup gris', scientific_name: 'Canis lupus' })).toBe(false);
    expect(isConfidentGenericDomestic({ ...base, animal_name: 'Cheval domestique', scientific_name: 'Equus caballus', is_real_photo: false })).toBe(false);
  });
});
