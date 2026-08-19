/**
 * Second level inside the big categories.
 *
 * Two kinds of sub-groups:
 *  - breed groups: domestic species whose entries are breeds (102 dog breeds share
 *    "Canis lupus familiaris"). They are pulled OUT of the main grid to avoid noise.
 *  - type groups: families / informal groups of wild species (papillons, rapaces,
 *    serpents…). They stay visible in the main grid and only act as a filter.
 *
 * Everything is derived from the name (vernacular or scientific) so no data migration
 * is needed.
 */
export interface BreedGroup {
  key: string;
  label: string;
  emoji: string;
  /** Scientific names (lowercase) that belong to this group. */
  scientificNames?: string[];
  /** Normalized keywords matched against the vernacular name. */
  keywords?: string[];
  /** Categories this group applies to (normalized prefix, e.g. "Insectes"). */
  categories?: string[];
  /** Breed groups are excluded from the "all species" grid. */
  breeds?: boolean;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const BREEDS: BreedGroup[] = [
  { key: 'dog', label: 'Races de chien', emoji: '🐕', breeds: true, scientificNames: ['canis lupus familiaris', 'canis familiaris'] },
  { key: 'cat', label: 'Races de chat', emoji: '🐈', breeds: true, scientificNames: ['felis catus', 'felis silvestris catus'] },
  { key: 'cattle', label: 'Races de vache', emoji: '🐄', breeds: true, scientificNames: ['bos taurus'] },
  { key: 'horse', label: 'Races de cheval', emoji: '🐎', breeds: true, scientificNames: ['equus caballus', 'equus ferus caballus'] },
  { key: 'chicken', label: 'Races de poule', emoji: '🐓', breeds: true, scientificNames: ['gallus gallus domesticus'] },
  { key: 'sheep', label: 'Races de mouton', emoji: '🐑', breeds: true, scientificNames: ['ovis aries'] },
  { key: 'goat', label: 'Races de chèvre', emoji: '🐐', breeds: true, scientificNames: ['capra hircus', 'capra aegagrus hircus'] },
  { key: 'rabbit', label: 'Races de lapin', emoji: '🐇', breeds: true, scientificNames: ['oryctolagus cuniculus', 'oryctolagus cuniculus domesticus'] },
  { key: 'duck-breed', label: 'Races de canard', emoji: '🦆', breeds: true, scientificNames: ['anas platyrhynchos domesticus'] },
  { key: 'goose', label: "Races d'oie", emoji: '🪿', breeds: true, scientificNames: ['anser anser domesticus'] },
  { key: 'pig', label: 'Races de cochon', emoji: '🐖', breeds: true, scientificNames: ['sus scrofa domesticus'] },
  { key: 'donkey', label: "Races d'âne", emoji: '🫏', breeds: true, scientificNames: ['equus asinus', 'equus africanus asinus'] },
];

const TYPES: BreedGroup[] = [
  // ---------- Insectes ----------
  { key: 'butterflies', label: 'Papillons', emoji: '🦋', categories: ['Insectes'], keywords: ['papillon', 'chenille', 'chrysalide', 'azure', 'argus', 'pieride', 'vanesse', 'machaon', 'citron', 'aurore', 'belle dame', 'morio', 'paon de jour', 'nacre', 'hesperie', 'apollon', 'sphinx', 'bombyx', 'noctuelle', 'phalene', 'zygene', 'ecaille', 'melitee', 'moire', 'myrtil', 'amaryllis', 'tircis', 'carte geographique', 'crambus', 'teigne', 'pyrale', 'pyrauste', 'geometre', 'adele', 'cuivre', 'fritillaire', 'satyre', 'tabac d espagne', 'lycene', 'arctii'] },
  { key: 'ladybugs', label: 'Coccinelles', emoji: '🐞', categories: ['Insectes'], keywords: ['coccinelle'] },
  { key: 'dragonflies', label: 'Libellules', emoji: '🪰', categories: ['Insectes'], keywords: ['libellule', 'agrion', 'aeschne', 'anax', 'calopteryx', 'sympetrum', 'cordulie', 'cordulegastre', 'gomphe', 'leste', 'orthetrum', 'naiade', 'demoiselle'] },
  { key: 'bees', label: 'Abeilles & guêpes', emoji: '🐝', categories: ['Insectes'], keywords: ['abeille', 'bourdon', 'guepe', 'frelon', 'andrene', 'osmie', 'anthidie', 'collete', 'xylocope', 'chrysis', 'ammophile', 'sphex', 'ichneumon', 'braconid', 'tenthrede', 'bembex', 'megachile', 'halicte'] },
  { key: 'ants', label: 'Fourmis', emoji: '🐜', categories: ['Insectes'], keywords: ['fourmi'] },
  { key: 'beetles', label: 'Coléoptères', emoji: '🪲', categories: ['Insectes'], keywords: ['coleoptere', 'carabe', 'cetoine', 'capricorne', 'chrysomele', 'charancon', 'hanneton', 'bupreste', 'cantharide', 'longicorne', 'scarabee', 'lucane', 'tenebrion', 'taupin', 'staphylin', 'cicindele', 'altise', 'criocere', 'clyte', 'dytique', 'bousier', 'doryphore', 'lampyre', 'ver luisant', 'clairon', 'anthrene', 'balanin', 'clytre'] },
  { key: 'grasshoppers', label: 'Criquets & sauterelles', emoji: '🦗', categories: ['Insectes'], keywords: ['criquet', 'sauterelle', 'grillon', 'courtiliere', 'ephippigere', 'decticelle', 'oedipode', 'phaneroptere', 'tetrix'] },
  { key: 'bugs', label: 'Punaises', emoji: '🛡️', categories: ['Insectes'], keywords: ['punaise', 'gendarme', 'pentatome', 'coree', 'reduve', 'nepe', 'notonecte', 'graphosome'] },
  { key: 'cicadas', label: 'Cigales & pucerons', emoji: '🎶', categories: ['Insectes'], keywords: ['cigale', 'cicadelle', 'cercope', 'puceron', 'psylle', 'cochenille', 'aleurode'] },
  { key: 'flies', label: 'Mouches & moustiques', emoji: '🪳', categories: ['Insectes'], keywords: ['mouche', 'moustique', 'taon', 'syrphe', 'bombyle', 'tipule', 'asile', 'eristale', 'cousin', 'bibion', 'drosophile', 'lucilie', 'asticot', 'cecidomyie', 'chlorops'] },
  { key: 'stick-insects', label: 'Phasmes & mantes', emoji: '🥢', categories: ['Insectes'], keywords: ['phasme', 'mante', 'batonnet', 'empuse'] },
  { key: 'cockroaches', label: 'Blattes & perce-oreilles', emoji: '🪳', categories: ['Insectes'], keywords: ['blatte', 'cafard', 'perce oreille', 'forficule'] },
  { key: 'lacewings', label: 'Fourmilions & chrysopes', emoji: '✨', categories: ['Insectes'], keywords: ['chrysope', 'fourmilion', 'ascalaphe', 'panorpe', 'mouche scorpion'] },

  // ---------- Oiseaux ----------
  { key: 'raptors', label: 'Rapaces', emoji: '🦅', categories: ['Oiseaux'], keywords: ['aigle', 'buse', 'faucon', 'milan', 'busard', 'epervier', 'autour', 'vautour', 'balbuzard', 'chouette', 'hibou', 'effraie', 'bondree', 'circaete', 'gypaete'] },
  { key: 'waterbirds', label: "Oiseaux d'eau", emoji: '🦆', categories: ['Oiseaux'], keywords: ['canard', 'colvert', 'sarcelle', 'oie', 'cygne', 'foulque', 'grebe', 'heron', 'aigrette', 'cormoran', 'harle', 'fuligule', 'rale', 'butor', 'cigogne', 'ibis', 'spatule', 'flamant', 'plongeon', 'macreuse', 'garrot', 'tadorne', 'bernache', 'poule d eau', 'gallinule', 'souchet', 'pilet', 'nette', 'martin pecheur'] },
  { key: 'seabirds', label: 'Oiseaux marins & limicoles', emoji: '🌊', categories: ['Oiseaux'], keywords: ['mouette', 'goeland', 'sterne', 'guifette', 'chevalier', 'becasse', 'becasseau', 'courlis', 'barge', 'huitrier', 'gravelot', 'vanneau', 'pluvier', 'tournepierre', 'macareux', 'fou de bassan', 'puffin', 'oceanite', 'guillemot', 'pingouin', 'echasse', 'avocette', 'combattant', 'chevalier gambette'] },
  { key: 'passerines', label: 'Passereaux', emoji: '🐦', categories: ['Oiseaux'], keywords: ['mesange', 'moineau', 'pinson', 'chardonneret', 'verdier', 'bruant', 'fauvette', 'pouillot', 'rougegorge', 'rouge gorge', 'rouge queue', 'rougequeue', 'merle', 'grive', 'hirondelle', 'martinet', 'bergeronnette', 'alouette', 'pipit', 'troglodyte', 'accenteur', 'gobemouche', 'roitelet', 'linotte', 'serin', 'tarin', 'gros bec', 'etourneau', 'corneille', 'corbeau', 'pie', 'geai', 'choucas', 'cassenoix', 'crave', 'rousserolle', 'rossignol', 'traquet', 'tarier', 'loriot', 'sittelle', 'grimpereau', 'hypolais', 'phragmite', 'cincle', 'venturon', 'bouvreuil'] },
  { key: 'woodpeckers', label: 'Pics', emoji: '🪵', categories: ['Oiseaux'], keywords: ['pic ', 'pic-', 'torcol', 'pic'] },
  { key: 'poultry', label: 'Volailles & gallinacés', emoji: '🐓', categories: ['Oiseaux'], keywords: ['poule', 'coq', 'dinde', 'pintade', 'paon', 'faisan', 'perdrix', 'caille', 'tetras', 'gelinotte', 'lagopede'] },
  { key: 'pigeons', label: 'Pigeons & tourterelles', emoji: '🕊️', categories: ['Oiseaux'], keywords: ['pigeon', 'colombe', 'tourterelle', 'ramier', 'biset'] },
  { key: 'parrots', label: 'Perroquets', emoji: '🦜', categories: ['Oiseaux'], keywords: ['perroquet', 'perruche', 'ara ', 'cacatoes', 'inseparable', 'conure'] },

  // ---------- Poissons ----------
  { key: 'sharks', label: 'Requins & raies', emoji: '🦈', categories: ['Poissons'], keywords: ['requin', 'raie', 'roussette', 'torpille', 'pastenague', 'aiguillat', 'emissole', 'chimere'] },
  { key: 'freshwater-fish', label: "Poissons d'eau douce", emoji: '🎣', categories: ['Poissons'], keywords: ['truite', 'carpe', 'brochet', 'perche', 'gardon', 'silure', 'sandre', 'tanche', 'goujon', 'ablette', 'barbeau', 'chevesne', 'anguille', 'saumon', 'omble', 'vairon', 'epinoche', 'black bass', 'poisson rouge', 'esturgeon', 'loche', 'rotengle', 'breme', 'lamproie', 'chabot'] },
  { key: 'seafish', label: 'Poissons de mer', emoji: '🐟', categories: ['Poissons'], keywords: ['bar ', 'dorade', 'daurade', 'maquereau', 'sardine', 'thon', 'merlu', 'sole', 'turbot', 'rouget', 'mulet', 'congre', 'lieu', 'morue', 'cabillaud', 'hareng', 'anchois', 'grondin', 'vieille', 'labre', 'blennie', 'gobie', 'girelle', 'murene', 'merou', 'saint pierre', 'chinchard', 'orphie', 'baliste', 'rascasse', 'sar ', 'sparaillon', 'oblade', 'bogue'] },
  { key: 'reef-fish', label: 'Poissons de récif', emoji: '🐠', categories: ['Poissons'], keywords: ['poisson clown', 'poisson ange', 'chirurgien', 'poisson papillon', 'poisson perroquet', 'demoiselle', 'napoleon', 'poisson lion', 'poisson pierre', 'poisson coffre', 'balistes'] },
  { key: 'seahorses', label: 'Hippocampes', emoji: '🐴', categories: ['Poissons'], keywords: ['hippocampe', 'syngnathe'] },

  // ---------- Reptiles ----------
  { key: 'snakes', label: 'Serpents', emoji: '🐍', categories: ['Reptiles'], keywords: ['serpent', 'couleuvre', 'vipere', 'boa', 'python', 'cobra', 'crotale', 'mamba', 'anaconda'] },
  { key: 'lizards', label: 'Lézards', emoji: '🦎', categories: ['Reptiles'], keywords: ['lezard', 'gecko', 'orvet', 'iguane', 'agame', 'cameleon', 'varan', 'seps', 'scinque', 'tarente'] },
  { key: 'turtles', label: 'Tortues', emoji: '🐢', categories: ['Reptiles'], keywords: ['tortue', 'cistude', 'emyde'] },
  { key: 'crocodiles', label: 'Crocodiliens', emoji: '🐊', categories: ['Reptiles'], keywords: ['crocodile', 'alligator', 'caiman', 'gavial'] },

  // ---------- Amphibiens ----------
  { key: 'frogs', label: 'Grenouilles & crapauds', emoji: '🐸', categories: ['Amphibiens'], keywords: ['grenouille', 'crapaud', 'rainette', 'pelodyte', 'alyte', 'sonneur', 'pelobate', 'discoglosse'] },
  { key: 'salamanders', label: 'Salamandres & tritons', emoji: '🦎', categories: ['Amphibiens'], keywords: ['salamandre', 'triton', 'axolotl', 'euprocte'] },

  // ---------- Mollusques (inclut méduses, oursins, vers) ----------
  { key: 'snails', label: 'Escargots', emoji: '🐌', categories: ['Mollusques'], keywords: ['escargot', 'helix', 'limacon', 'bulime', 'planorbe', 'bigorneau', 'patelle', 'ormeau', 'clausilie', 'maillot'] },
  { key: 'slugs', label: 'Limaces', emoji: '🐛', categories: ['Mollusques'], keywords: ['limace', 'loche grise', 'arion'] },
  { key: 'bivalves', label: 'Coquillages', emoji: '🐚', categories: ['Mollusques'], keywords: ['moule', 'huitre', 'coque', 'palourde', 'praire', 'coquille saint jacques', 'telline', 'couteau', 'anodonte', 'clovisse', 'peigne'] },
  { key: 'cephalopods', label: 'Céphalopodes', emoji: '🦑', categories: ['Mollusques'], keywords: ['poulpe', 'pieuvre', 'calmar', 'calamar', 'encornet', 'seiche', 'nautile', 'sepiole'] },
  { key: 'jellyfish', label: 'Méduses & anémones', emoji: '🪼', categories: ['Mollusques'], keywords: ['meduse', 'anemone', 'physalie', 'corail', 'gorgone', 'velelle', 'hydre'] },
  { key: 'echinoderms', label: 'Oursins & étoiles de mer', emoji: '⭐', categories: ['Mollusques'], keywords: ['oursin', 'etoile de mer', 'ophiure', 'concombre de mer', 'holothurie', 'comatule'] },
  { key: 'worms', label: 'Vers', emoji: '🪱', categories: ['Mollusques'], keywords: ['ver ', 'vers ', 'lombric', 'sangsue', 'annelide', 'arenicole', 'nereide', 'planaire'] },

  // ---------- Crustacés ----------
  { key: 'crabs', label: 'Crabes', emoji: '🦀', categories: ['Crustacés'], keywords: ['crabe', 'tourteau', 'etrille', 'araignee de mer', 'pagure', 'bernard l hermite', 'bernard'] },
  { key: 'shrimps', label: 'Crevettes', emoji: '🦐', categories: ['Crustacés'], keywords: ['crevette', 'langoustine', 'bouquet', 'gambas', 'palemon'] },
  { key: 'lobsters', label: 'Homards & écrevisses', emoji: '🦞', categories: ['Crustacés'], keywords: ['homard', 'langouste', 'ecrevisse', 'cigale de mer'] },
  { key: 'isopods', label: 'Cloportes & petits crustacés', emoji: '🪨', categories: ['Crustacés'], keywords: ['cloporte', 'balane', 'gammare', 'daphnie', 'aselle', 'talitre'] },

  // ---------- Arachnides ----------
  { key: 'spiders', label: 'Araignées', emoji: '🕷️', categories: ['Arachnides'], keywords: ['araignee', 'epeire', 'tegenaire', 'saltique', 'thomise', 'lycose', 'argiope', 'segestrie', 'pholque', 'mygale', 'veuve', 'dolomede', 'pisaure', 'clubione', 'micrommate'] },
  { key: 'scorpions', label: 'Scorpions', emoji: '🦂', categories: ['Arachnides'], keywords: ['scorpion'] },
  { key: 'ticks', label: 'Tiques & acariens', emoji: '🔬', categories: ['Arachnides'], keywords: ['tique', 'acarien', 'aoutat', 'trombidion'] },
  { key: 'harvestmen', label: 'Faucheux', emoji: '🕸️', categories: ['Arachnides'], keywords: ['faucheux', 'opilion'] },

  // ---------- Mammifères ----------
  { key: 'bats', label: 'Chauves-souris', emoji: '🦇', categories: ['Mammifères'], keywords: ['chauve souris', 'pipistrelle', 'murin', 'noctule', 'oreillard', 'rhinolophe', 'barbastelle', 'minioptere', 'roussette'] },
  { key: 'rodents', label: 'Rongeurs', emoji: '🐿️', categories: ['Mammifères'], keywords: ['souris', 'rat ', 'mulot', 'campagnol', 'ecureuil', 'marmotte', 'loir', 'lerot', 'muscardin', 'ragondin', 'castor', 'hamster', 'gerbille', 'cochon d inde', 'chinchilla', 'porc epic', 'rat musque'] },
  { key: 'carnivores', label: 'Carnivores', emoji: '🦊', categories: ['Mammifères'], keywords: ['renard', 'loup', 'blaireau', 'martre', 'fouine', 'hermine', 'belette', 'putois', 'loutre', 'lynx', 'chat sauvage', 'chat forestier', 'ours', 'genette', 'vison', 'raton', 'tigre', 'lion', 'leopard', 'guepard', 'hyene', 'panthere'] },
  { key: 'ungulates', label: 'Ongulés', emoji: '🦌', categories: ['Mammifères'], keywords: ['chevreuil', 'cerf', 'biche', 'sanglier', 'chamois', 'bouquetin', 'mouflon', 'daim', 'elan', 'renne', 'girafe', 'zebre', 'antilope', 'gazelle', 'buffle', 'bison', 'yak'] },
  { key: 'marine-mammals', label: 'Mammifères marins', emoji: '🐬', categories: ['Mammifères'], keywords: ['dauphin', 'baleine', 'cachalot', 'marsouin', 'orque', 'phoque', 'otarie', 'morse', 'rorqual'] },
  { key: 'insectivores', label: 'Hérissons & musaraignes', emoji: '🦔', categories: ['Mammifères'], keywords: ['herisson', 'taupe', 'musaraigne', 'crossope', 'desman'] },
  { key: 'primates', label: 'Primates', emoji: '🐒', categories: ['Mammifères'], keywords: ['singe', 'macaque', 'chimpanze', 'gorille', 'lemurien', 'ouistiti', 'babouin', 'orang outan', 'maki'] },
  { key: 'hares', label: 'Lièvres & lapins sauvages', emoji: '🐰', categories: ['Mammifères'], keywords: ['lievre', 'lapin de garenne'] },
];

export const BREED_GROUPS: BreedGroup[] = [...BREEDS, ...TYPES];

const GROUP_BY_SCIENTIFIC = new Map<string, BreedGroup>();
BREEDS.forEach((group) => {
  group.scientificNames?.forEach((sn) => GROUP_BY_SCIENTIFIC.set(sn, group));
});

/** Returns the breed group of a species (domestic breeds only). */
export const getBreedGroup = (scientificName?: string | null): BreedGroup | null => {
  if (!scientificName) return null;
  return GROUP_BY_SCIENTIFIC.get(scientificName.trim().toLowerCase()) || null;
};

/**
 * Returns the sub-group of a species inside its category: a breed group when the
 * species is a domestic breed, otherwise a "type" group (papillons, rapaces…).
 */
export const getSpeciesGroup = (
  name?: string | null,
  scientificName?: string | null,
  category?: string | null,
): BreedGroup | null => {
  const breed = getBreedGroup(scientificName);
  if (breed) return breed;

  const label = normalize(`${name || ''} ${scientificName || ''}`);
  if (!label) return null;
  const cat = normalize(category || '');

  for (const group of TYPES) {
    if (group.categories && !group.categories.some((c) => cat.startsWith(normalize(c)))) continue;
    if (group.keywords?.some((kw) => label.includes(normalize(kw)))) return group;
  }
  return null;
};

/** Minimum number of entries required before a group gets its own chip. */
export const MIN_BREEDS_PER_GROUP = 2;
