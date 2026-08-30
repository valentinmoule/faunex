/**
 * Binômes scientifiques partagés par de multiples races domestiques.
 *
 * Un Bichon maltais et un Cocker anglais sont tous les deux « Canis lupus familiaris » :
 * comparer les noms scientifiques y produit de faux doublons. Sur ces taxons, la
 * comparaison doit se faire uniquement sur le nom commun (la race).
 */
const SHARED_BINOMIALS = new Set([
  'canis lupus familiaris',
  'canis familiaris',
  'canis lupus',
  'felis catus',
  'felis silvestris catus',
  'equus caballus',
  'equus ferus caballus',
  'equus asinus',
  'equus africanus asinus',
  'bos taurus',
  'ovis aries',
  'capra hircus',
  'capra aegagrus hircus',
  'sus scrofa domesticus',
  'gallus gallus domesticus',
  'oryctolagus cuniculus',
  'oryctolagus cuniculus domesticus',
  'anas platyrhynchos domesticus',
  'anser anser domesticus',
  'columba livia domestica',
]);

export const normalizeScientific = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * true quand le nom scientifique identifie une espèce précise et peut donc servir
 * de clé de doublon. Faux pour les races domestiques et les rangs supra-spécifiques.
 */
export const isSpeciesBinomial = (scientific?: string | null) => {
  const s = normalizeScientific(scientific);
  if (!s) return false;
  if (SHARED_BINOMIALS.has(s)) return false;
  const parts = s.split(' ').filter(Boolean);
  if (parts.length < 2) return false;
  if (/(idae|inae|oidea|aceae|iformes|ptera|morpha)$/.test(parts[0])) return false;
  return true;
};
