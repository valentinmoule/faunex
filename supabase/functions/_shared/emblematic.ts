/**
 * Espèces emblématiques par territoire.
 *
 * Objectif produit : une collection « territoire » doit être une sélection courte
 * et désirable (les espèces qui font l'identité du territoire), pas un catalogue
 * exhaustif. On plafonne donc volontairement la taille de la sélection.
 */

export const MAX_EMBLEMATIC = 36;
export const MAX_EMBLEMATIC_OVERSEAS = 28;

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ');

export const COASTAL_DEPTS = new Set([
  '06', '11', '13', '14', '17', '22', '29', '30', '33', '34', '35', '40', '44', '50', '56', '59', '62', '64', '66', '76', '80', '83', '85', '2A', '2B', '971', '972', '973', '974', '976',
]);
export const MOUNTAIN_DEPTS = new Set(['04', '05', '06', '09', '15', '25', '26', '31', '38', '39', '42', '43', '48', '63', '64', '65', '66', '67', '68', '73', '74', '88', '2A', '2B']);
export const MEDITERRANEAN_DEPTS = new Set(['04', '05', '06', '11', '13', '30', '34', '66', '83', '84', '2A', '2B']);
export const URBAN_DEPTS = new Set(['59', '69', '75', '92', '93', '94']);
export const WETLAND_DEPTS = new Set(['01', '13', '17', '30', '33', '34', '35', '37', '41', '44', '45', '49', '51', '56', '67', '68', '80', '85']);
export const OVERSEAS_DEPTS = new Set(['971', '972', '973', '974', '976']);

/** Faune sauvage emblématique commune à la France métropolitaine. */
const CORE_EMBLEMATIC = [
  // Mammifères
  'renard roux', 'chevreuil', 'sanglier', 'ecureuil roux', 'herisson', 'blaireau', 'martre', 'cerf elaphe', 'lievre',
  // Oiseaux
  'chouette hulotte', 'effraie', 'faucon crecerelle', 'buse variable', 'pic vert', 'pic epeiche', 'huppe fasciee',
  'martin-pecheur', 'geai des chenes', 'mesange bleue', 'rougegorge', 'hirondelle rustique', 'chardonneret',
  // Insectes & invertébrés
  'machaon', 'paon-du-jour', 'vulcain', 'flambe', 'lucane cerf-volant', 'mante religieuse', 'abeille domestique',
  // Reptiles & amphibiens
  'salamandre tachetee', 'triton crete', 'lezard vert', 'couleuvre a collier', 'orvet',
];

const BIOME_EMBLEMATIC: Array<{ depts: Set<string>; keywords: string[] }> = [
  {
    depts: MOUNTAIN_DEPTS,
    keywords: ['chamois', 'bouquetin', 'isard', 'marmotte', 'lynx', 'loup gris', 'gypaete', 'vautour fauve', 'aigle royal', 'tetras', 'lagopede', 'apollon', 'chocard', 'accenteur alpin', 'ours brun'],
  },
  {
    depts: COASTAL_DEPTS,
    keywords: ['phoque', 'goeland argente', 'huitrier pie', 'sterne', 'fou de bassan', 'macareux', 'grand cormoran', 'avocette', 'tadorne', 'grand dauphin', 'etoile de mer', 'hippocampe', 'crabe vert'],
  },
  {
    depts: MEDITERRANEAN_DEPTS,
    keywords: ['flamant rose', 'cigale', 'tortue d hermann', 'lezard ocelle', 'guepier', 'rollier', 'gecko', 'scorpion languedocien', 'cistude', 'merou brun'],
  },
  {
    depts: WETLAND_DEPTS,
    keywords: ['heron cendre', 'aigrette garzette', 'busard des roseaux', 'grebe huppe', 'cygne tubercule', 'loutre', 'castor', 'brochet', 'caloptery', 'anax', 'agrion'],
  },
  {
    depts: URBAN_DEPTS,
    keywords: ['perruche a collier', 'martinet noir', 'pipistrelle', 'lezard des murailles', 'faucon crecerelle', 'effraie', 'renard roux', 'herisson'],
  },
  {
    depts: OVERSEAS_DEPTS,
    keywords: ['colibri', 'iguane', 'tortue verte', 'tortue luth', 'baleine a bosse', 'dauphin', 'fregate', 'paille-en-queue', 'cameleon', 'gecko', 'ara', 'toucan', 'paresseux', 'jaguar', 'caiman', 'requin citron', 'crabe de terre', 'lemurien'],
  },
];

/** Espèce « drapeau » de quelques territoires très identifiés. */
const DEPT_FLAGSHIPS: Record<string, string[]> = {
  '2A': ['mouflon de corse', 'gypaete', 'balbuzard'],
  '2B': ['mouflon de corse', 'gypaete', 'balbuzard'],
  '13': ['flamant rose', 'cheval de camargue', 'taureau de camargue'],
  '17': ['loutre', 'avocette'],
  '29': ['macareux', 'phoque gris', 'fou de bassan'],
  '33': ['esturgeon', 'cigogne blanche'],
  '64': ['ours brun', 'desman', 'gypaete'],
  '65': ['ours brun', 'isard', 'gypaete'],
  '73': ['bouquetin', 'aigle royal', 'gypaete'],
  '74': ['bouquetin', 'chamois', 'lynx'],
  '75': ['faucon crecerelle', 'perruche a collier', 'renard roux'],
  '971': ['racoon', 'iguane des petites antilles', 'tortue verte'],
  '972': ['colibri', 'matoutou', 'tortue luth'],
  '973': ['jaguar', 'ara', 'paresseux', 'caiman', 'tortue luth'],
  '974': ['paille-en-queue', 'tuit-tuit', 'baleine a bosse', 'cameleon'],
  '976': ['lemurien', 'maki', 'baleine a bosse', 'tortue verte'],
};

/** Animaux jamais considérés comme emblématiques d'un territoire. */
const NEVER_EMBLEMATIC = [
  'chien', 'chat', 'vache', 'boeuf', 'mouton', 'chevre', 'poule', 'coq', 'canard domestique', 'oie', 'dinde', 'cochon', 'porc',
  'lapin domestique', 'cobaye', 'hamster', 'furet', 'poisson rouge', 'pigeon biset', 'rat surmulot', 'souris domestique',
  'moustique', 'mouche domestique', 'cafard', 'blatte', 'pou', 'puce', 'tique', 'frelon asiatique',
].map(norm);

const RARITY_WEIGHT: Record<string, number> = { mythic: 0, epic: 1, rare: 2, common: 3 };

export interface EmblematicCandidate {
  name: string;
  category: string;
  rarity: string;
}

export const emblematicKeywords = (code: string) => {
  const keywords = [...(DEPT_FLAGSHIPS[code] || []), ...CORE_EMBLEMATIC];
  for (const biome of BIOME_EMBLEMATIC) {
    if (biome.depts.has(code)) keywords.push(...biome.keywords);
  }
  return keywords.map(norm);
};

/**
 * Sélectionne une courte liste d'espèces emblématiques du territoire, triées
 * des plus prestigieuses (mythique) aux plus accessibles.
 */
export const buildEmblematicAnimals = <T extends EmblematicCandidate>(code: string, sourceAnimals: T[]): T[] => {
  const keywords = emblematicKeywords(code);
  const limit = OVERSEAS_DEPTS.has(code) ? MAX_EMBLEMATIC_OVERSEAS : MAX_EMBLEMATIC;

  const seen = new Set<string>();
  const matched: { animal: T; score: number }[] = [];

  for (const animal of sourceAnimals) {
    if (animal.category.toLowerCase().includes('(monde)')) continue;
    const name = norm(animal.name);
    if (NEVER_EMBLEMATIC.some((bad) => name.includes(bad))) continue;
    const index = keywords.findIndex((keyword) => name.includes(keyword));
    if (index === -1) continue;
    const key = animal.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Priorité : position dans la liste (flagships d'abord) puis rareté.
    matched.push({ animal, score: index * 10 + (RARITY_WEIGHT[animal.rarity] ?? 3) });
  }

  return matched
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.animal);
};

export const buildEmblematicSet = (code: string, sourceAnimals: EmblematicCandidate[]) =>
  new Set(buildEmblematicAnimals(code, sourceAnimals).map((animal) => animal.name.toLowerCase()));
