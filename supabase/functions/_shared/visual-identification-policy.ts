export const MORPHOLOGY_RULE = `MORPHOLOGIE AVANT LE NOM : observe uniquement les caractères réellement visibles : appendices, segmentation, proportions, forme, motifs et structures distinctives. Ne compte pas les caractères masqués comme absents. Le lieu ou le nom proposé ne prouve jamais une espèce. Si le sujet est petit/flou ou les caractères spécifiques invisibles : rang supérieur sûr et confiance ≤60, jamais un binôme deviné. RACES DOMESTIQUES : cherche une race réelle grâce à ses caractères diagnostiques, jamais grâce au seul sexe ou à une couleur. Pour tout animal, ne nomme une race, une variété ou une sous-espèce que si ses caractères diagnostiques sont nets (confiance ≥80) ; sinon réponds au niveau de l'espèce sans inventer de rang inférieur (ex. « Cheval domestique », « Chien domestique », « Poule domestique » ou « Coq domestique » pour un mâle adulte évident). ORTHOGRAPHE : écris le nom vernaculaire français officiel, correctement orthographié, sans variante.`;

const foldChicken = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z]+/g, ' ').trim();
const GENERIC_CHICKEN = /^(?:(?:poules?|coqs?)(?: domestiques?)?(?: et (?:poules?|coqs?)(?: domestiques?)?)?)$/;

/** Vague chicken labels (other than the two canonical tiles) never become tiles. */
export function isGenericDomesticChicken(value: unknown): boolean {
  const name = foldChicken(value);
  return GENERIC_CHICKEN.test(name) && name !== 'poule domestique' && name !== 'coq domestique';
}

/**
 * Canonical fallback for chickens whose breed is not reliable: vague labels
 * and low-confidence breeds collapse to the existing generic tile.
 */
export function chickenFallbackName(name: unknown, scientific: unknown, confidence: number | null): string | null {
  const n = foldChicken(name);
  const sci = foldChicken(scientific);
  const isChicken = GENERIC_CHICKEN.test(n) || sci === 'gallus gallus domesticus' || (/^(poule|coq|poussin)\b/.test(n) && (!sci || sci.startsWith('gallus')));
  if (!isChicken || sci === 'gallus gallus' && !/domestique/.test(n)) return null;
  const male = /^coqs?\b/.test(n);
  const generic = male ? 'Coq domestique' : 'Poule domestique';
  if (GENERIC_CHICKEN.test(n)) return generic;
  if (typeof confidence === 'number' && confidence < 80) return generic;
  return null;
}

export function moderationVisionModels(quality: string, forceName: boolean) {
  return quality === 'high' && !forceName
    ? ['google/gemini-3.8-flash']
    : ['google/gemini-3.1-flash-lite', 'google/gemini-3.8-flash'];
}
const DOMESTIC_GENERIC: Record<string, string[]> = {
  'chien domestique': ['canis lupus familiaris', 'canis familiaris'],
  'chat europeen': ['felis catus', 'felis silvestris catus'],
    'cheval domestique': ['equus caballus', 'equus ferus caballus'],
  'ane domestique': ['equus asinus', 'equus africanus asinus', 'equus asinus asinus'],
  'chevre domestique': ['capra hircus', 'capra aegagrus hircus'],
  'mouton domestique': ['ovis aries'],
  'vache domestique': ['bos taurus'],
  'poule domestique': ['gallus gallus domesticus'],
  'coq domestique': ['gallus gallus domesticus'],
};

/**
 * Generic domestic answer whose common and scientific names agree: the deep
 * pass measured on these returned the same generic tile, so it is skipped.
 * Low confidence (possible wild look-alike) still goes to the deep pass.
 */
export function isConfidentGenericDomestic(data: any): boolean {
  if (!data || data.is_real_photo !== true) return false;
  const name = foldChicken(data.animal_name);
  const sci = String(data.scientific_name ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const allowed = DOMESTIC_GENERIC[name];
  const confidence = typeof data.confidence === 'number' ? data.confidence : 0;
  return Boolean(allowed?.includes(sci)) && confidence >= 45;
}

const DOMESTIC_TILE: Record<string, string> = {
  'chien domestique': 'Chien domestique', 'chat europeen': 'Chat européen', 'cheval domestique': 'Cheval domestique',
  'ane domestique': 'Âne domestique', 'chevre domestique': 'Chèvre domestique', 'mouton domestique': 'Mouton domestique',
  'vache domestique': 'Vache domestique',
};

/**
 * General rule for every domestic species: a breed is kept only when confident
 * (>=80); otherwise the answer collapses to the species-level generic tile.
 */
export function breedFallbackName(name: unknown, scientific: unknown, confidence: number | null): string | null {
  const chicken = chickenFallbackName(name, scientific, confidence);
  if (chicken) return chicken;
  const n = foldChicken(name);
  const sci = String(scientific ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [key, scis] of Object.entries(DOMESTIC_GENERIC)) {
    if (!DOMESTIC_TILE[key] || !scis.includes(sci)) continue;
    if (n === key) return null;
    return typeof confidence === 'number' && confidence < 80 ? DOMESTIC_TILE[key] : null;
  }
  return null;
}

const TILE_SCIENTIFIC: Record<string, string> = {
  'Poule domestique': 'Gallus gallus domesticus', 'Coq domestique': 'Gallus gallus domesticus',
  'Chien domestique': 'Canis familiaris', 'Chat européen': 'Felis catus', 'Cheval domestique': 'Equus caballus',
  'Âne domestique': 'Equus asinus asinus', 'Chèvre domestique': 'Capra aegagrus hircus',
  'Mouton domestique': 'Ovis aries', 'Vache domestique': 'Bos taurus',
};
/** Scientific name of the catalogue tile a breed fallback points to. */
export const fallbackScientific = (tile: string) => TILE_SCIENTIFIC[tile] ?? null;
