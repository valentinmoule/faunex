/**
 * Badge catalogue.
 *
 * Badges are grouped by family so the profile page stays readable now that
 * there are many of them (progression, espèces, rareté, collections,
 * classement, social).
 *
 * Dynamic badges (one per completed collection, one per category where the user
 * is #1) are built at runtime from the user's data.
 */

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

export const BADGE_GROUP_LABELS: Record<BadgeGroup, { label: string; icon: string }> = {
  progression: { label: 'Progression', icon: '🚀' },
  especes: { label: 'Espèces', icon: '🐾' },
  rarete: { label: 'Rareté', icon: '💎' },
  collections: { label: 'Collections', icon: '📚' },
  classement: { label: 'Classement', icon: '🏆' },
  social: { label: 'Communauté', icon: '🤝' },
};

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

/** Static badges, always visible. */
export const STATIC_BADGES: BadgeDef[] = [
  // ---- Progression ----
  { id: 'first_capture', name: 'Première capture', icon: '📸', description: 'Capturer ton premier animal', total: 1, group: 'progression', xp: 50 },
  { id: 'explorer_10', name: 'Explorateur', icon: '🧭', description: 'Réaliser 10 captures', total: 10, group: 'progression', xp: 100 },
  { id: 'explorer_25', name: 'Naturaliste', icon: '🌿', description: 'Réaliser 25 captures', total: 25, group: 'progression', xp: 200 },
  { id: 'explorer_50', name: 'Expert faune', icon: '🔬', description: 'Réaliser 50 captures', total: 50, group: 'progression', xp: 500 },
  { id: 'explorer_100', name: 'Grand collectionneur', icon: '🏛️', description: 'Réaliser 100 captures', total: 100, group: 'progression', xp: 1000 },
  { id: 'level_5', name: 'Niveau 5', icon: '🏅', description: 'Atteindre le niveau 5', total: 5, group: 'progression', xp: 150 },
  { id: 'level_10', name: 'Niveau 10', icon: '🎖️', description: 'Atteindre le niveau 10', total: 10, group: 'progression', xp: 400 },
  { id: 'regions_3', name: 'Baroudeur', icon: '🗺️', description: 'Explorer 3 régions', total: 3, group: 'progression', xp: 150 },
  { id: 'regions_10', name: 'Globe-trotteur', icon: '🌍', description: 'Explorer 10 régions', total: 10, group: 'progression', xp: 400 },
  { id: 'geo_10', name: 'Cartographe', icon: '📍', description: 'Géolocaliser 10 captures', total: 10, group: 'progression', xp: 200 },
  { id: 'night_owl', name: 'Explorateur nocturne', icon: '🌙', description: 'Capturer un animal entre 21h et 5h', total: 1, group: 'progression', xp: 150 },
  { id: 'early_bird', name: 'Lève-tôt', icon: '🌅', description: 'Capturer un animal entre 5h et 8h', total: 1, group: 'progression', xp: 150 },

  // ---- Espèces (catégories) ----
  { id: 'birds_5', name: 'Ornithologue', icon: '🐦', description: 'Capturer 5 oiseaux', total: 5, group: 'especes', xp: 100 },
  { id: 'mammals_5', name: 'Mammalogiste', icon: '🦊', description: 'Capturer 5 mammifères', total: 5, group: 'especes', xp: 100 },
  { id: 'insects_5', name: 'Entomologiste', icon: '🦋', description: 'Capturer 5 insectes', total: 5, group: 'especes', xp: 100 },
  { id: 'reptiles_3', name: 'Herpétologue', icon: '🦎', description: 'Capturer 3 reptiles', total: 3, group: 'especes', xp: 100 },
  { id: 'amphibians_3', name: 'Batracologue', icon: '🐸', description: 'Capturer 3 amphibiens', total: 3, group: 'especes', xp: 100 },
  { id: 'fishes_3', name: 'Ichtyologue', icon: '🐟', description: 'Capturer 3 poissons', total: 3, group: 'especes', xp: 100 },
  { id: 'arachnids_3', name: 'Arachnologue', icon: '🕷️', description: 'Capturer 3 arachnides', total: 3, group: 'especes', xp: 100 },
  { id: 'molluscs_3', name: 'Malacologue', icon: '🐌', description: 'Capturer 3 mollusques', total: 3, group: 'especes', xp: 100 },
  { id: 'crustaceans_3', name: 'Carcinologue', icon: '🦀', description: 'Capturer 3 crustacés', total: 3, group: 'especes', xp: 100 },
  { id: 'categories_all', name: 'Touche-à-tout', icon: '🧬', description: 'Capturer au moins 1 espèce dans 9 catégories', total: 9, group: 'especes', xp: 750 },

  // ---- Rareté ----
  { id: 'rare_1', name: 'Chasseur rare', icon: '💎', description: 'Trouver un animal rare ou mieux', total: 1, group: 'rarete', xp: 150 },
  { id: 'rare_10', name: 'Traqueur de raretés', icon: '🔎', description: 'Trouver 10 animaux rares ou mieux', total: 10, group: 'rarete', xp: 400 },
  { id: 'legendary_1', name: 'Éclat argenté', icon: '⭐', description: 'Trouver une espèce ultra rare', total: 1, group: 'rarete', xp: 300 },
  { id: 'legendary_5', name: 'Collection argent', icon: '🌟', description: 'Trouver 5 espèces ultra rares', total: 5, group: 'rarete', xp: 600 },
  { id: 'mythic_1', name: 'Étoile dorée !', icon: '🔥', description: 'Trouver une espèce de rareté or', total: 1, group: 'rarete', xp: 500 },
  { id: 'mythic_3', name: 'Panthéon doré', icon: '🐉', description: 'Trouver 3 espèces de rareté or', total: 3, group: 'rarete', xp: 1000 },

  // ---- Classement ----
  { id: 'podium_any', name: 'Sur le podium', icon: '🥉', description: 'Entrer dans le top 3 d’une catégorie', total: 1, group: 'classement', xp: 300 },
  { id: 'top10_any', name: 'Top 10', icon: '📊', description: 'Entrer dans le top 10 d’une catégorie', total: 1, group: 'classement', xp: 150 },

  // ---- Social ----
  { id: 'social_3', name: 'Sociable', icon: '🤝', description: 'Suivre 3 explorateurs', total: 3, group: 'social', xp: 75 },
  { id: 'social_10', name: 'Réseauteur', icon: '📣', description: 'Suivre 10 explorateurs', total: 10, group: 'social', xp: 200 },
  { id: 'followers_5', name: 'Inspirant', icon: '✨', description: 'Être suivi par 5 explorateurs', total: 5, group: 'social', xp: 200 },
  { id: 'followers_25', name: 'Star de Faunex', icon: '👑', description: 'Être suivi par 25 explorateurs', total: 25, group: 'social', xp: 600 },
];

/** One badge per collection (races de chien, papillons…) fully completed. */
export const collectionBadge = (key: string, label: string, emoji: string, total: number): BadgeDef => ({
  id: `${COLLECTION_BADGE_PREFIX}${key}`,
  name: label,
  icon: emoji,
  description: `Compléter la collection ${label.toLowerCase()}`,
  total,
  group: 'collections',
  xp: Math.min(1000, 100 + total * 20),
});

/** One badge per category where the explorer is #1 of the leaderboard. */
export const rank1Badge = (category: string, emoji: string): BadgeDef => ({
  id: `${RANK1_BADGE_PREFIX}${category.toLowerCase()}`,
  name: `N°1 ${category}`,
  icon: emoji,
  description: `Être 1er du classement ${category}`,
  total: 1,
  group: 'classement',
  xp: 500,
});

export const badgeXp = (badge: BadgeDef) => badge.xp;
