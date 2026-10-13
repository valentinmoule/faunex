/**
 * Garde-fou contre les noms d'espèces « vides » : on refuse « inconnu », « ?? »,
 * « n/a »… aussi bien pour le nom commun que pour le nom scientifique.
 */
const PLACEHOLDERS = new Set([
  'inconnu',
  'inconnue',
  'je ne sais pas',
  'je sais pas',
  'je ne qais as',
  'unknown',
  '??',
  '???',
  '?',
  'n/a',
  'na',
  'none',
  'null',
  '-',
  '—',
  'x',
  'xx',
]);

export const isPlaceholderName = (value: string | null | undefined): boolean => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return true;
  if (PLACEHOLDERS.has(v)) return true;
  return (
    /inconnu|unknown/.test(v) ||
    /\bje\s*(?:ne\s*)?(?:sais|qais)\s*(?:pas|as)\b/.test(v) ||
    /\bje\s+pense\b/.test(v) ||
    /^[?\-–—.\s]+$/.test(v)
  );
};

/**
 * Noms trop vagues pour remplir une case du Bestiaire : « Oiseau », « Oisillon »,
 * « Opilion »… désignent un groupe, pas une espèce. L'identification qui aboutit
 * à l'un d'eux doit passer en validation manuelle (saisie + modération).
 */
const VAGUE_GROUP_NAMES = new Set([
  'oiseau', 'oiseaux', 'oisillon', 'oisillons', 'oiseau de proie',
  'opilion', 'opilions', 'opillion', 'opiliones', 'faucheur', 'faucheuse', 'faucheux',
  'insecte', 'insectes', 'araignée', 'araignee', 'araignées', 'papillon', 'papillons',
  'poisson', 'poissons', 'mammifère', 'mammifere', 'mammifères', 'reptile', 'reptiles',
  'amphibien', 'amphibiens', 'mollusque', 'mollusques', 'crustacé', 'crustace', 'crustacés',
  'ver', 'vers', 'chenille', 'chenilles', 'larve', 'larves', 'limace', 'limaces',
  'escargot', 'escargots', 'mouche', 'mouches', 'guêpe', 'guepe', 'guêpes',
  'abeille', 'abeilles', 'fourmi', 'fourmis', 'coléoptère', 'coleoptere', 'coléoptères',
  'libellule', 'libellules', 'sauterelle', 'sauterelles', 'criquet', 'criquets',
  'hibou', 'chouette', 'rapace', 'rapaces', 'serpent', 'serpents', 'lézard', 'lezard', 'lézards',
  'grenouille', 'grenouilles', 'crapaud', 'crapauds', 'tortue', 'tortues',
  'rongeur', 'rongeurs', 'chauve-souris', 'chauves-souris', 'poisson rouge',
  'bird', 'birds', 'chick', 'insect', 'insects', 'spider', 'spiders', 'butterfly',
  'butterflies', 'moth', 'fish', 'mammal', 'reptile', 'amphibian', 'mollusk', 'mollusc',
  'crustacean', 'worm', 'caterpillar', 'larva', 'slug', 'snail', 'fly', 'wasp', 'bee',
  'ant', 'beetle', 'dragonfly', 'grasshopper', 'owl', 'raptor', 'snake', 'lizard',
  'frog', 'toad', 'turtle', 'rodent', 'bat', 'harvestman', 'harvestmen',
]);

export const isVagueGroupName = (value: string | null | undefined): boolean => {
  const v = (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!v) return false;
  return VAGUE_GROUP_NAMES.has(v);
};

/** Renvoie le nom scientifique s'il est exploitable, sinon null. */
export const cleanScientificName = (value: string | null | undefined): string | null => {
  const v = (value || '').trim();
  return !v || isPlaceholderName(v) ? null : v;
};
