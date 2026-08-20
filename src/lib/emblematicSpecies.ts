/**
 * Espèces emblématiques par territoire.
 *
 * Objectif produit : une collection « territoire » doit être une sélection courte
 * et désirable (les espèces qui font l'identité du territoire), pas un catalogue
 * exhaustif. On plafonne donc volontairement la taille de la sélection.
 *
 * Principe : chaque département reçoit
 *   1. ses espèces « drapeau » (identité forte),
 *   2. les espèces de ses biomes (montagne, littoral, méditerranéen, zones humides,
 *      urbain dense, outre-mer),
 *   3. un socle de faune commune adapté au type de territoire (urbain vs nature).
 * L'ordre est important : les premières espèces trouvées remplissent le quota.
 */

export const MAX_EMBLEMATIC = 32;
export const MAX_EMBLEMATIC_OVERSEAS = 26;

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
/** Départements où la nature « sauvage » est marginale : le socle devient urbain. */
export const DENSE_URBAN_DEPTS = new Set(['75', '92', '93', '94']);
export const WETLAND_DEPTS = new Set(['01', '13', '17', '30', '33', '34', '35', '37', '41', '44', '45', '49', '51', '56', '67', '68', '80', '85']);
export const OVERSEAS_DEPTS = new Set(['971', '972', '973', '974', '976']);

/** Socle de faune sauvage des territoires « nature » (métropole). */
const RURAL_CORE = [
  // Mammifères
  'renard roux', 'chevreuil', 'sanglier', 'ecureuil roux', 'herisson', 'blaireau', 'cerf elaphe', 'lievre d europe',
  // Oiseaux
  'chouette hulotte', 'effraie', 'buse variable', 'faucon crecerelle', 'pic vert', 'pic epeiche',
  'martin-pecheur', 'geai des chenes', 'mesange bleue', 'rougegorge', 'hirondelle rustique', 'chardonneret', 'huppe fasciee',
  // Insectes & invertébrés
  'machaon', 'paon-du-jour', 'vulcain', 'lucane cerf-volant', 'abeille domestique', 'coccinelle a 7 points',
  // Reptiles & amphibiens
  'salamandre tachetee', 'lezard vert', 'couleuvre a collier', 'crapaud commun', 'orvet',
];

/** Socle de la faune que l'on croise réellement en ville dense. */
const URBAN_CORE = [
  // Oiseaux du quotidien urbain
  'pigeon biset', 'moineau domestique', 'merle noir', 'pie bavarde', 'corneille noire', 'etourneau sansonnet',
  'mouette rieuse', 'martinet noir', 'rougequeue noir', 'mesange charbonniere', 'rougegorge', 'perruche a collier',
  'faucon crecerelle', 'effraie', 'canard colvert', 'foulque macroule', 'cygne tubercule', 'heron cendre', 'choucas des tours',
  // Mammifères
  'renard roux', 'herisson', 'ecureuil roux', 'pipistrelle',
  // Reptiles & invertébrés
  'lezard des murailles', 'abeille domestique', 'bourdon terrestre', 'coccinelle a 7 points', 'machaon',
  'paon-du-jour', 'vulcain', 'araignee des murs',
];

const BIOME_EMBLEMATIC: Array<{ depts: Set<string>; keywords: string[] }> = [
  {
    depts: MOUNTAIN_DEPTS,
    keywords: ['chamois', 'bouquetin des alpes', 'isard', 'marmotte', 'lynx', 'loup gris', 'gypaete', 'vautour fauve', 'aigle royal', 'tetras', 'lagopede', 'apollon', 'chocard', 'accenteur alpin', 'ours brun'],
  },
  {
    depts: COASTAL_DEPTS,
    keywords: ['phoque', 'goeland argente', 'huitrier pie', 'sterne', 'fou de bassan', 'macareux', 'grand cormoran', 'avocette', 'tadorne', 'grand dauphin', 'etoile de mer', 'hippocampe', 'crabe vert'],
  },
  {
    depts: MEDITERRANEAN_DEPTS,
    keywords: ['flamant rose', 'cigale', 'mante religieuse', 'tortue d hermann', 'lezard ocelle', 'guepier', 'rollier', 'gecko', 'scorpion languedocien', 'cistude', 'merou brun'],
  },
  {
    depts: WETLAND_DEPTS,
    keywords: ['heron cendre', 'aigrette garzette', 'busard des roseaux', 'grebe huppe', 'cygne tubercule', 'loutre', 'castor', 'brochet', 'caloptery', 'anax', 'agrion'],
  },
  {
    depts: DENSE_URBAN_DEPTS,
    keywords: ['perruche a collier', 'martinet noir', 'pipistrelle', 'lezard des murailles', 'faucon crecerelle', 'effraie', 'renard roux', 'herisson', 'pigeon biset', 'moineau domestique', 'mouette rieuse'],
  },
];

/** Outre-mer : chaque territoire n'a que sa propre faune, pas une liste tropicale générique. */
const OVERSEAS_KEYWORDS: Record<string, string[]> = {
  '971': ['iguane des petites antilles', 'racoon', 'colibri madere', 'colibri huppe', 'sucrier a ventre jaune', 'pelican brun', 'fregate superbe', 'tortue verte', 'tortue imbriquee', 'anolis', 'crabe de terre', 'grand dauphin', 'baleine a bosse', 'sphinx', 'mabuya'],
  '972': ['matoutou falaise', 'colibri huppe', 'colibri falle-vert', 'sucrier a ventre jaune', 'fregate superbe', 'pelican brun', 'tortue luth', 'tortue verte', 'anolis', 'crabe de terre', 'trigonocephale', 'grand dauphin', 'baleine a bosse', 'manicou'],
  '973': ['jaguar', 'ara macao', 'ara bleu', 'toucan', 'paresseux', 'caiman', 'singe hurleur', 'tapir', 'tamanoir', 'coq de roche', 'ibis rouge', 'iguane vert', 'anaconda', 'tortue luth', 'dendrobate', 'morpho', 'raie', 'piranha', 'loutre geante'],
  '974': ['paille-en-queue', 'tuit-tuit', 'papangue', 'oiseau la vierge', 'zosterops', 'gecko vert de manapany', 'cameleon panthere', 'endormi', 'baleine a bosse', 'grand dauphin', 'tortue verte', 'tortue imbriquee', 'requin bouledogue', 'poisson-papillon', 'bourbon'],
  '976': ['maki', 'lemurien', 'roussette', 'drongo', 'foudi', 'cameleon de mayotte', 'tortue verte', 'tortue imbriquee', 'dugong', 'baleine a bosse', 'dauphin', 'poisson-clown', 'raie manta', 'crabier blanc'],
};

/** Marqueurs géographiques : une espèce nommée « ... de Madagascar » n'est pas d'un autre territoire. */
const GEO_MARKERS: Array<{ marker: string; depts: string[] }> = [
  { marker: 'de madagascar', depts: [] },
  { marker: 'de mayotte', depts: ['976'] },
  { marker: 'de la reunion', depts: ['974'] },
  { marker: 'des petites antilles', depts: ['971', '972'] },
  { marker: 'de guyane', depts: ['973'] },
  { marker: 'de corse', depts: ['2A', '2B'] },
  { marker: 'de mediterranee', depts: [...MEDITERRANEAN_DEPTS] },
  { marker: 'du pacifique', depts: [] },
  { marker: 'de cuba', depts: [] },
  { marker: 'de floride', depts: [] },
  { marker: 'du bresil', depts: [] },
  { marker: 'd amerique', depts: [] },
  { marker: 'd afrique', depts: [] },
  { marker: 'du japon', depts: [] },
  { marker: 'de chine', depts: [] },
  { marker: 'd asie', depts: [] },
];

const geoAllows = (name: string, code: string) =>
  GEO_MARKERS.every(({ marker, depts }) => !name.includes(marker) || depts.includes(code));


/** Espèce « drapeau » de quelques territoires très identifiés. */
const DEPT_FLAGSHIPS: Record<string, string[]> = {
  '2A': ['mouflon de corse', 'gypaete', 'balbuzard'],
  '2B': ['mouflon de corse', 'gypaete', 'balbuzard'],
  '13': ['flamant rose', 'cheval de camargue', 'taureau de camargue'],
  '17': ['loutre', 'avocette'],
  '29': ['macareux', 'phoque gris', 'fou de bassan'],
  '33': ['esturgeon', 'cigogne blanche'],
  '59': ['phoque veau-marin', 'goeland argente', 'heron cendre'],
  '64': ['ours brun', 'desman', 'gypaete'],
  '65': ['ours brun', 'isard', 'gypaete'],
  '69': ['martinet noir', 'faucon crecerelle', 'castor'],
  '73': ['bouquetin des alpes', 'aigle royal', 'gypaete'],
  '74': ['bouquetin des alpes', 'chamois', 'lynx'],
  '75': ['pigeon biset', 'faucon crecerelle', 'perruche a collier', 'moineau domestique', 'renard roux'],
  '92': ['perruche a collier', 'ecureuil roux', 'pigeon biset'],
  '93': ['renard roux', 'pigeon biset', 'faucon crecerelle'],
  '94': ['heron cendre', 'pigeon biset', 'perruche a collier'],
  '971': ['racoon', 'iguane des petites antilles', 'tortue verte'],
  '972': ['colibri', 'matoutou', 'tortue luth'],
  '973': ['jaguar', 'ara', 'paresseux', 'caiman', 'tortue luth'],
  '974': ['paille-en-queue', 'tuit-tuit', 'baleine a bosse', 'cameleon'],
  '976': ['lemurien', 'maki', 'baleine a bosse', 'tortue verte'],
};

/**
 * Animaux jamais considérés comme emblématiques d'un territoire :
 * animaux de compagnie / d'élevage et vraies nuisances domestiques.
 * (Les oiseaux urbains comme le pigeon biset restent éligibles en ville.)
 */
const NEVER_EMBLEMATIC = [
  'chien', 'chat', 'vache', 'boeuf', 'mouton', 'chevre', 'poule', 'coq', 'canard domestique', 'oie', 'dinde', 'cochon', 'porc',
  'lapin domestique', 'cobaye', 'hamster', 'furet', 'poisson rouge', 'carpe koi', 'rat surmulot', 'souris domestique',
  'moustique', 'mouche domestique', 'cafard', 'blatte', 'pou', 'puce', 'tique', 'frelon asiatique', 'punaise de lit',
].map(norm);

const RARITY_WEIGHT: Record<string, number> = { mythic: 0, epic: 1, rare: 2, common: 3 };

export interface EmblematicCandidate {
  name: string;
  category: string;
  rarity: string;
}

export const emblematicKeywords = (code: string) => {
  const overseas = OVERSEAS_DEPTS.has(code);
  const keywords: string[] = [...(DEPT_FLAGSHIPS[code] || [])];

  if (overseas) {
    keywords.push(...(OVERSEAS_KEYWORDS[code] || []));
  } else {
    for (const biome of BIOME_EMBLEMATIC) {
      if (biome.depts.has(code)) keywords.push(...biome.keywords);
    }
    keywords.push(...(DENSE_URBAN_DEPTS.has(code) ? URBAN_CORE : RURAL_CORE));
  }

  return keywords.map(norm);
};


/** 0 = nom exact, 1 = commence par le mot-clé, 2 = mot-clé présent en mot entier. */
const matchScore = (name: string, keyword: string): number | null => {
  if (name === keyword) return 0;
  if (name.startsWith(`${keyword} `) || name.startsWith(`${keyword}-`)) return 1;
  const boundary = new RegExp(`(^|[\\s\\-(])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s\\-)])`);
  return boundary.test(name) ? 2 : null;
};

/**
 * Sélectionne une courte liste d'espèces emblématiques du territoire :
 * au plus une espèce par espèce-drapeau, dans l'ordre d'emblématicité.
 */
export const buildEmblematicAnimals = <T extends EmblematicCandidate>(code: string, sourceAnimals: T[]): T[] => {
  const keywords = emblematicKeywords(code);
  const limit = OVERSEAS_DEPTS.has(code) ? MAX_EMBLEMATIC_OVERSEAS : MAX_EMBLEMATIC;

  const candidates = sourceAnimals
    .filter((animal) => !animal.category.toLowerCase().includes('(monde)'))
    .map((animal) => ({ animal, name: norm(animal.name) }))
    .filter(({ name }) => geoAllows(name, code))
    .filter(({ name }) => !NEVER_EMBLEMATIC.some((bad) => name.includes(bad)));


  const picked: T[] = [];
  const usedNames = new Set<string>();

  for (const keyword of keywords) {
    if (picked.length >= limit) break;
    let best: { animal: T; score: number } | null = null;
    for (const { animal, name } of candidates) {
      if (usedNames.has(name)) continue;
      const position = matchScore(name, keyword);
      if (position === null) continue;
      const score = position * 10 + (RARITY_WEIGHT[animal.rarity] ?? 3) + name.length / 1000;
      if (!best || score < best.score) best = { animal, score };
    }
    if (best) {
      picked.push(best.animal);
      usedNames.add(norm(best.animal.name));
    }
  }

  return picked;
};

export const buildEmblematicSet = (code: string, sourceAnimals: EmblematicCandidate[]) =>
  new Set(buildEmblematicAnimals(code, sourceAnimals).map((animal) => animal.name.toLowerCase()));
