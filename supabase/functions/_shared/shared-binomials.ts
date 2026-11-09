/**
 * Binômes scientifiques partagés par plusieurs races, variétés ou fiches
 * collectionnables domestiques (Canari frisé, Canari Gloster, Arlequin
 * portugais = Serinus canaria domestica). Sur ces taxons, le même nom
 * scientifique n'est jamais un doublon : la comparaison se fait sur le nom
 * commun (la race). Copie conforme de src/lib/sharedBinomials.ts.
 */
export const SHARED_BINOMIALS = new Set([
  'canis lupus familiaris', 'canis familiaris', 'canis lupus',
  'felis catus', 'felis silvestris catus',
  'equus caballus', 'equus ferus caballus', 'equus asinus', 'equus africanus asinus',
  'bos taurus', 'bos primigenius taurus', 'ovis aries',
  'capra hircus', 'capra aegagrus hircus',
  'sus scrofa domesticus', 'gallus gallus domesticus', 'gallus gallus',
  'oryctolagus cuniculus', 'oryctolagus cuniculus domesticus',
  'anas platyrhynchos domesticus', 'anser anser domesticus',
  'columba livia domestica', 'cavia porcellus', 'mesocricetus auratus',
  'pavo cristatus', 'carassius auratus', 'cyprinus carpio', 'betta splendens',
  'serinus canaria', 'serinus canaria domestica', 'neocaridina davidi',
  'rattus norvegicus', 'mus musculus', 'mustela putorius furo',
  'meleagris gallopavo', 'coturnix japonica',
]);

/** Épithètes marquant une forme domestique : toutes ses races partagent le binôme. */
const DOMESTIC_EPITHETS = new Set(['domesticus', 'domestica', 'domesticum', 'familiaris']);

export const normalizeScientific = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** true quand le nom scientifique désigne une forme domestique à races multiples. */
export const isSharedDomesticBinomial = (scientific?: string | null) => {
  const s = normalizeScientific(scientific);
  if (!s) return false;
  if (SHARED_BINOMIALS.has(s)) return true;
  const parts = s.split(' ');
  return parts.slice(2).some((p) => DOMESTIC_EPITHETS.has(p));
};

/**
 * true quand le nom scientifique identifie une espèce précise et peut donc servir
 * de clé de doublon. Faux pour les races domestiques et les rangs supra-spécifiques.
 */
export const isSpeciesBinomial = (scientific?: string | null) => {
  const s = normalizeScientific(scientific);
  if (!s) return false;
  if (isSharedDomesticBinomial(s)) return false;
  const parts = s.split(' ').filter(Boolean);
  if (parts.length < 2) return false;
  if (/(idae|inae|oidea|aceae|iformes|ptera|morpha)$/.test(parts[0])) return false;
  return true;
};
