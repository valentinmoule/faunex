/**
 * Garde-fou contre les noms d'espèces « vides » : on refuse « inconnu », « ?? »,
 * « n/a »… aussi bien pour le nom commun que pour le nom scientifique.
 */
const PLACEHOLDERS = new Set([
  'inconnu',
  'inconnue',
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
  return /inconnu|unknown/.test(v) || /^[?\-–—.\s]+$/.test(v);
};

/** Renvoie le nom scientifique s'il est exploitable, sinon null. */
export const cleanScientificName = (value: string | null | undefined): string | null => {
  const v = (value || '').trim();
  return !v || isPlaceholderName(v) ? null : v;
};
