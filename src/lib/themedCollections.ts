import { normalizeCategory } from '@/lib/bestiary';
import { normalizeRarity } from '@/data/mockData';

export interface ThemedCollection {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  cover_url: string | null;
  species_names: string[];
  rule_categories: string[];
  rule_rarities: string[];
  rule_keywords: string[];
  starts_at: string | null;
  ends_at: string | null;
  published: boolean;
  sort_order: number;
}

export const THEME_PREFIX = 'theme:';

const norm = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'-]/g, ' ').replace(/\s+/g, ' ').trim();

/** Visible now: published and within its optional date window. */
export const isThemeActive = (c: Pick<ThemedCollection, 'published' | 'starts_at' | 'ends_at'>, now = new Date()) =>
  c.published &&
  (!c.starts_at || new Date(c.starts_at) <= now) &&
  (!c.ends_at || new Date(c.ends_at) > now);

export const hasThemeRules = (c: ThemedCollection) =>
  c.rule_categories.length > 0 || c.rule_rarities.length > 0 || c.rule_keywords.length > 0;

/**
 * A species belongs to a themed collection when it is listed by name, or when it
 * satisfies every rule family that is set (category AND rarity AND keyword).
 */
export const themeMatcher = (c: ThemedCollection) => {
  const names = new Set(c.species_names.map(norm));
  const cats = c.rule_categories.map((x) => normalizeCategory(x));
  const rarities = new Set(c.rule_rarities);
  const keywords = c.rule_keywords.map(norm).filter(Boolean);
  const ruled = hasThemeRules(c);
  return (a: { name: string; scientific_name?: string | null; category?: string | null; rarity?: string | null }) => {
    if (names.has(norm(a.name)) || (a.scientific_name && names.has(norm(a.scientific_name)))) return true;
    if (!ruled) return false;
    if (cats.length && !cats.includes(normalizeCategory(a.category || ''))) return false;
    if (rarities.size && !rarities.has(normalizeRarity(a.rarity))) return false;
    if (keywords.length) {
      const label = norm(`${a.name} ${a.scientific_name || ''}`);
      if (!keywords.some((k) => label.includes(k))) return false;
    }
    return true;
  };
};

export const themeTitle = (c: ThemedCollection, lang: string) =>
  lang.startsWith('en') && c.title_en ? c.title_en : c.title;
