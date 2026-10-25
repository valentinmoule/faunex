import { describe, it, expect } from 'vitest';
import { isThemeActive, themeMatcher, type ThemedCollection } from '@/lib/themedCollections';

const base: ThemedCollection = {
  id: '1', title: 'T', title_en: null, description: null, cover_url: null,
  species_names: [], rule_categories: [], rule_rarities: [], rule_keywords: [],
  starts_at: null, ends_at: null, published: true, sort_order: 0,
};

describe('themed collections', () => {
  it('includes manually listed species', () => {
    const m = themeMatcher({ ...base, species_names: ['Renard roux'] });
    expect(m({ name: 'Renard roux', category: 'Mammifères', rarity: 'common' })).toBe(true);
    expect(m({ name: 'Blaireau', category: 'Mammifères', rarity: 'common' })).toBe(false);
  });
  it('requires every set rule family', () => {
    const m = themeMatcher({ ...base, rule_categories: ['Oiseaux'], rule_rarities: ['rare'] });
    expect(m({ name: 'Hibou', category: 'Oiseaux (monde)', rarity: 'rare' })).toBe(true);
    expect(m({ name: 'Moineau', category: 'Oiseaux', rarity: 'common' })).toBe(false);
  });
  it('hides drafts and collections outside their dates', () => {
    const now = new Date('2026-10-25T12:00:00Z');
    expect(isThemeActive({ ...base, published: false }, now)).toBe(false);
    expect(isThemeActive({ ...base, ends_at: '2026-10-01T00:00:00Z' }, now)).toBe(false);
    expect(isThemeActive({ ...base, starts_at: '2026-11-01T00:00:00Z' }, now)).toBe(false);
    expect(isThemeActive({ ...base, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-11-01T00:00:00Z' }, now)).toBe(true);
  });
});
