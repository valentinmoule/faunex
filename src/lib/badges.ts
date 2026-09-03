/**
 * Badge catalogue.
 *
 * Badges are grouped by family so the profile page stays readable now that
 * there are many of them (progression, espèces, rareté, collections,
 * classement, social).
 *
 * Dynamic badges (one per completed collection, one per category where the user
 * is #1) are built at runtime from the user's data.
 *
 * Names/descriptions are translated via i18next (`profile.badges.*`); the
 * helpers below take a `t` function so callers stay in control of the
 * current language.
 */

import type { TFunction } from 'i18next';

export type BadgeGroup =
  | 'progression'
  | 'especes'
  | 'rarete'
  | 'collections'
  | 'classement'
  | 'social';

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  total: number;
  group: BadgeGroup;
  xp: number;
}

/** Raw (untranslated) definition of a static badge. */
type StaticBadgeSeed = Omit<BadgeDef, 'name' | 'description'>;

export const BADGE_GROUP_ICONS: Record<BadgeGroup, string> = {
  progression: '🚀',
  especes: '🐾',
  rarete: '💎',
  collections: '📚',
  classement: '🏆',
  social: '🤝',
};

export const getGroupLabel = (t: TFunction, group: BadgeGroup) => t(`profile.badges.groups.${group}`);

export const BADGE_GROUP_ORDER: BadgeGroup[] = [
  'progression',
  'especes',
  'rarete',
  'collections',
  'classement',
  'social',
];

export const COLLECTION_BADGE_PREFIX = 'collection_';
export const RANK1_BADGE_PREFIX = 'rank1_';

/** Static badges seeds, always visible (name/description resolved via `translateBadge`). */
export const STATIC_BADGE_SEEDS: StaticBadgeSeed[] = [
  // ---- Progression ----
  { id: 'first_capture', icon: '📸', total: 1, group: 'progression', xp: 50 },
  { id: 'explorer_10', icon: '🧭', total: 10, group: 'progression', xp: 100 },
  { id: 'explorer_25', icon: '🌿', total: 25, group: 'progression', xp: 200 },
  { id: 'explorer_50', icon: '🔬', total: 50, group: 'progression', xp: 500 },
  { id: 'explorer_100', icon: '🏛️', total: 100, group: 'progression', xp: 1000 },
  { id: 'level_5', icon: '🏅', total: 5, group: 'progression', xp: 150 },
  { id: 'level_10', icon: '🎖️', total: 10, group: 'progression', xp: 400 },
  { id: 'regions_3', icon: '🗺️', total: 3, group: 'progression', xp: 150 },
  { id: 'regions_10', icon: '🌍', total: 10, group: 'progression', xp: 400 },
  { id: 'geo_10', icon: '📍', total: 10, group: 'progression', xp: 200 },
  { id: 'night_owl', icon: '🌙', total: 1, group: 'progression', xp: 150 },
  { id: 'early_bird', icon: '🌅', total: 1, group: 'progression', xp: 150 },

  // ---- Espèces (catégories) ----
  { id: 'birds_5', icon: '🐦', total: 5, group: 'especes', xp: 100 },
  { id: 'mammals_5', icon: '🦊', total: 5, group: 'especes', xp: 100 },
  { id: 'insects_5', icon: '🦋', total: 5, group: 'especes', xp: 100 },
  { id: 'reptiles_3', icon: '🦎', total: 3, group: 'especes', xp: 100 },
  { id: 'amphibians_3', icon: '🐸', total: 3, group: 'especes', xp: 100 },
  { id: 'fishes_3', icon: '🐟', total: 3, group: 'especes', xp: 100 },
  { id: 'arachnids_3', icon: '🕷️', total: 3, group: 'especes', xp: 100 },
  { id: 'molluscs_3', icon: '🐌', total: 3, group: 'especes', xp: 100 },
  { id: 'crustaceans_3', icon: '🦀', total: 3, group: 'especes', xp: 100 },
  { id: 'categories_all', icon: '🧬', total: 9, group: 'especes', xp: 750 },

  // ---- Rareté ----
  { id: 'rare_1', icon: '💎', total: 1, group: 'rarete', xp: 150 },
  { id: 'rare_10', icon: '🔎', total: 10, group: 'rarete', xp: 400 },
  { id: 'legendary_1', icon: '⭐', total: 1, group: 'rarete', xp: 300 },
  { id: 'legendary_5', icon: '🌟', total: 5, group: 'rarete', xp: 600 },
  { id: 'mythic_1', icon: '🔥', total: 1, group: 'rarete', xp: 500 },
  { id: 'mythic_3', icon: '🐉', total: 3, group: 'rarete', xp: 1000 },

  // ---- Classement ----
  { id: 'podium_any', icon: '🥉', total: 1, group: 'classement', xp: 300 },
  { id: 'top10_any', icon: '📊', total: 1, group: 'classement', xp: 150 },

  // ---- Social ----
  { id: 'social_3', icon: '🤝', total: 3, group: 'social', xp: 75 },
  { id: 'social_10', icon: '📣', total: 10, group: 'social', xp: 200 },
  { id: 'followers_5', icon: '✨', total: 5, group: 'social', xp: 200 },
  { id: 'followers_25', icon: '👑', total: 25, group: 'social', xp: 600 },
];

/** Resolves the translated name/description of a static badge seed. */
export const translateBadge = (t: TFunction, seed: StaticBadgeSeed): BadgeDef => ({
  ...seed,
  name: t(`profile.badges.items.${seed.id}.name`),
  description: t(`profile.badges.items.${seed.id}.description`),
});

/** One badge per collection (races de chien, papillons…) fully completed. */
export const collectionBadge = (t: TFunction, key: string, label: string, emoji: string, total: number): BadgeDef => ({
  id: `${COLLECTION_BADGE_PREFIX}${key}`,
  name: label,
  icon: emoji,
  description: t('profile.badges.collectionDescription', { label: label.toLowerCase() }),
  total,
  group: 'collections',
  xp: Math.min(1000, 100 + total * 20),
});

/** One badge per category where the explorer is #1 of the leaderboard. */
export const rank1Badge = (t: TFunction, category: string, emoji: string): BadgeDef => ({
  id: `${RANK1_BADGE_PREFIX}${category.toLowerCase()}`,
  name: t('profile.badges.rank1Name', { category }),
  icon: emoji,
  description: t('profile.badges.rank1Description', { category }),
  total: 1,
  group: 'classement',
  xp: 500,
});

export const badgeXp = (badge: BadgeDef) => badge.xp;
