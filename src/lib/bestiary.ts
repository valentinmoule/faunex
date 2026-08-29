import type { ComponentType } from 'react';
import { PawPrint, Bird, Fish, Bug, Turtle, Shell, Snail, Waves } from 'lucide-react';
import { FrogIcon } from '@/components/icons/FrogIcon';
import { SpiderIcon } from '@/components/icons/SpiderIcon';
import type { AnimalCard } from '@/data/mockData';
import { buildEmblematicSet } from '@/lib/emblematicSpecies';


export interface BestiaryAnimal {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string;
  captured: boolean;
  captureData?: AnimalCard;
}

export interface ZoneSub {
  id: string;
  kind: 'department' | 'city';
  departmentCode: string;
  cityName: string | null;
  cityPostcode: string | null;
  isHome: boolean;
}

export const getCategoryIcon = (
  category: string
): ComponentType<{ className?: string; strokeWidth?: string | number }> => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return Bird;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish;
  if (cat.includes('insecte')) return Bug;
  if (cat.includes('reptile')) return Turtle;
  if (cat.includes('amphibien')) return FrogIcon;
  if (cat.includes('arachnide')) return SpiderIcon;
  if (cat.includes('crustacé')) return Shell;
  if (cat.includes('mollusque')) return Snail;
  if (cat.includes('mammifère') && cat.includes('marin')) return Waves;
  if (cat.includes('mammifère')) return PawPrint;
  return PawPrint;
};

export const getCategoryEmoji = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return '🐦';
  if (cat.includes('poisson') || cat.includes('vie marine')) return '🐟';
  if (cat.includes('insecte')) return '🦋';
  if (cat.includes('reptile')) return '🦎';
  if (cat.includes('amphibien')) return '🐸';
  if (cat.includes('arachnide')) return '🕷️';
  if (cat.includes('crustacé')) return '🦀';
  if (cat.includes('mollusque')) return '🐌';
  if (cat.includes('mammifère') && cat.includes('marin')) return '🐋';
  if (cat.includes('mammifère')) return '🦊';
  return '🐾';
};

/** Emoji par espèce (nom commun), repli sur l'emoji de catégorie. */
const SPECIES_EMOJI: Array<[string, string]> = [
  // Poissons & vie marine
  ['poisson chat', '🐟'], ['poisson', '🐟'], ['requin', '🦈'], ['raie', '🐟'], ['meduse', '🪼'],
  ['poulpe', '🐙'], ['pieuvre', '🐙'], ['calmar', '🦑'], ['seiche', '🦑'], ['crevette', '🦐'],
  ['langouste', '🦞'], ['homard', '🦞'], ['crabe', '🦀'], ['etrille', '🦀'], ['tourteau', '🦀'],
  ['araignee de mer', '🦀'], ['etolie de mer', '⭐'], ['oursin', '🦔'], ['anemone', '🌺'],
  ['coquillage', '🐚'], ['huitre', '🦪'], ['moule', '🐚'], ['palourde', '🐚'], ['bigorneau', '🐚'],
  ['bulot', '🐚'], ['escargot', '🐌'], ['limace', '🐌'], ['lombric', '🪱'], ['sangsue', '🪱'],
  ['truite', '🐟'], ['saumon', '🐟'], ['carpe', '🐟'], ['brochet', '🐟'], ['perche', '🐟'],
  ['gardon', '🐟'], ['anguille', '🐟'], ['silure', '🐟'], ['sandre', '🐟'], ['dauphin', '🐬'],
  ['marsouin', '🐬'], ['baleine', '🐳'], ['rorqual', '🐳'], ['orque', '🐋'], ['cachalot', '🐳'],
  ['phoque', '🦭'], ['otarie', '🦭'], ['morse', '🦭'], ['lamantin', '🦭'],
  // Insectes & arachnides
  ['papillon', '🦋'], ['abeille', '🐝'], ['bourdon', '🐝'], ['guepe', '🐝'], ['frelon', '🐝'],
  ['coccinelle', '🐞'], ['fourmi', '🐜'], ['libellule', '🪰'], ['sauterelle', '🦗'], ['grillon', '🦗'],
  ['criquet', '🦗'], ['mante', '🦗'], ['scarabee', '🪲'], ['coleoptere', '🪲'], ['hanneton', '🪲'],
  ['lucane', '🪲'], ['cetoine', '🪲'], ['punaise', '🪲'], ['moustique', '🦟'], ['mouche', '🪰'],
  ['taon', '🪰'], ['syrphe', '🪰'], ['chenille', '🐛'], ['puceron', '🐛'], ['cochenille', '🐛'],
  ['perce oreille', '🐛'], ['araignee', '🕷️'], ['tique', '🕷️'], ['acarien', '🕷️'], ['scorpion', '🦂'],
  ['opilion', '🕷️'], ['mille pattes', '🐛'], ['scolopendre', '🐛'], ['cloporte', '🪲'],
  // Oiseaux
  ['chat huant', '🦉'], ['hibou', '🦉'], ['chouette', '🦉'], ['aigle', '🦅'], ['faucon', '🦅'],
  ['epervier', '🦅'], ['milan', '🦅'], ['buse', '🦅'], ['vautour', '🦅'], ['corbeau', '🐦‍⬛'],
  ['corneille', '🐦‍⬛'], ['choucas', '🐦‍⬛'], ['pie', '🐦‍⬛'], ['geai', '🐦'], ['merle', '🐦'],
  ['moineau', '🐦'], ['mesange', '🐦'], ['rouge gorge', '🐦'], ['pinson', '🐦'], ['verdier', '🐦'],
  ['chardonneret', '🐦'], ['linotte', '🐦'], ['bouvreuil', '🐦'], ['hirondelle', '🐦'], ['martinet', '🐦'],
  ['pigeon', '🕊️'], ['colombe', '🕊️'], ['tourterelle', '🕊️'], ['perroquet', '🦜'], ['perruche', '🦜'],
  ['cacatoes', '🦜'], ['toucan', '🦜'], ['flamant', '🦩'], ['ibis', '🦩'], ['spatule', '🦩'],
  ['cigogne', '🦩'], ['heron', '🦩'], ['aigrette', '🦩'], ['paon', '🦚'], ['dinde', '🦃'],
  ['dindon', '🦃'], ['poule', '🐔'], ['coq', '🐓'], ['poussin', '🐤'], ['canard', '🦆'],
  ['oie', '🦢'], ['cygne', '🦢'], ['goeland', '🐦'], ['mouette', '🐦'], ['sterne', '🐦'],
  ['albatros', '🐦'], ['fou', '🐦'], ['manchot', '🐧'], ['pingouin', '🐧'], ['autruche', '🐦'],
  ['faisan', '🐦'], ['perdrix', '🐦'], ['caille', '🐦'], ['becasse', '🐦'], ['pic', '🐦'],
  ['alouette', '🐦'], ['bergeronnette', '🐦'], ['bruant', '🐦'], ['vanneau', '🐦'], ['pluvier', '🐦'],
  ['courlis', '🐦'], ['fuligule', '🦆'], ['sarcelle', '🦆'], ['harle', '🦆'], ['eider', '🦆'],
  ['macreuse', '🦆'], ['foulque', '🐦'], ['gallinule', '🐦'], ['grive', '🐦'], ['etourneau', '🐦'],
  ['loriot', '🐦'], ['rossignol', '🐦'], ['fauvette', '🐦'], ['troglodyte', '🐦'], ['roitelet', '🐦'],
  ['gobemouche', '🐦'], ['bec croise', '🐦'], ['sittelle', '🐦'], ['grimpereau', '🐦'], ['accenteur', '🐦'],
  ['pouillot', '🐦'], ['pipit', '🐦'], ['traquet', '🐦'], ['tarier', '🐦'], ['rousserolle', '🐦'],
  ['avocette', '🐦'], ['echasse', '🐦'], ['barge', '🐦'], ['chevalier', '🐦'], ['becasseau', '🐦'],
  ['grebe', '🐦'], ['coucou', '🐦'],
  // Mammifères
  ['chauve souris', '🦇'], ['ecureuil', '🐿️'], ['marmotte', '🐿️'], ['herisson', '🦔'], ['blaireau', '🦡'],
  ['castor', '🦫'], ['loutre', '🦦'], ['belette', '🦦'], ['hermine', '🦦'], ['martre', '🦦'],
  ['putois', '🦦'], ['vison', '🦦'], ['fouine', '🦦'], ['raton', '🦝'], ['genette', '🦝'],
  ['coati', '🦝'], ['mangouste', '🦝'], ['sanglier', '🐗'], ['chevreuil', '🦌'], ['cerf', '🦌'],
  ['daim', '🦌'], ['elan', '🫎'], ['renne', '🦌'], ['cheval', '🐴'], ['poney', '🐴'], ['vache', '🐮'],
  ['taureau', '🐂'], ['boeuf', '🐂'], ['bison', '🦬'], ['buffle', '🐃'], ['mouton', '🐑'],
  ['brebis', '🐑'], ['chevre', '🐐'], ['bouc', '🐐'], ['chamois', '🐐'], ['bouquetin', '🐐'],
  ['mouflon', '🐑'], ['lapin', '🐰'], ['lievre', '🐇'], ['renard', '🦊'], ['fennec', '🦊'],
  ['loup', '🐺'], ['coyote', '🐺'], ['hyene', '🐺'], ['ours', '🐻'], ['panda', '🐼'], ['chat', '🐱'],
  ['chien', '🐶'], ['chiot', '🐶'], ['singe', '🐒'], ['macaque', '🐒'], ['babouin', '🐒'],
  ['gorille', '🦍'], ['orang outan', '🦧'], ['gibbon', '🦧'], ['chimpanze', '🐒'], ['kangourou', '🦘'],
  ['koala', '🐨'], ['elephant', '🐘'], ['rhinoceros', '🦏'], ['hippopotame', '🦛'], ['girafe', '🦒'],
  ['zebre', '🦓'], ['lion', '🦁'], ['tigre', '🐯'], ['leopard', '🐆'], ['guepard', '🐆'],
  ['jaguar', '🐆'], ['lynx', '🐆'], ['puma', '🐆'], ['caracal', '🐆'], ['serval', '🐆'],
  ['souris', '🐭'], ['mulot', '🐭'], ['campagnol', '🐭'], ['musaraigne', '🐭'], ['taupe', '🐭'],
  ['hamster', '🐹'], ['rat', '🐀'], ['lama', '🦙'], ['alpaga', '🦙'], ['dromadaire', '🐪'],
  ['chameau', '🐫'], ['yack', '🐂'], ['antilope', '🦌'], ['gazelle', '🦌'], ['gnou', '🦬'],
  ['porc', '🐷'], ['cochon', '🐷'],
  // Reptiles & amphibiens
  ['grenouille', '🐸'], ['crapaud', '🐸'], ['rainette', '🐸'], ['salamandre', '🦎'], ['triton', '🦎'],
  ['lezard', '🦎'], ['gecko', '🦎'], ['cameleon', '🦎'], ['iguane', '🦎'], ['varan', '🦎'],
  ['orvet', '🦎'], ['serpent', '🐍'], ['vipere', '🐍'], ['couleuvre', '🐍'], ['coronelle', '🐍'],
  ['boa', '🐍'], ['python', '🐍'], ['tortue', '🐢'], ['cistude', '🐢'], ['crocodile', '🐊'],
  ['alligator', '🐊'],
];

export const getSpeciesEmoji = (name: string, category: string): string => {
  const n = ' ' + name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-'’]/g, ' ') + ' ';
  for (const [kw, emoji] of SPECIES_EMOJI) {
    if (n.includes(' ' + kw + ' ')) return emoji;
  }
  return getCategoryEmoji(category);
};

export const rarityBorderColor: Record<string, string> = {
  common: 'border-rarity-common/40',
  rare: 'border-rarity-rare/50',
  epic: 'border-rarity-epic/50',
  mythic: 'border-rarity-mythic/50',
};

export const rarityDot: Record<string, string> = {
  common: 'bg-rarity-common',
  rare: 'bg-rarity-rare',
  epic: 'bg-rarity-epic',
  mythic: 'bg-rarity-mythic',
};

export const rarityBadge: Record<string, string> = {
  common: 'bg-black/60 text-white backdrop-blur-sm',
  rare: 'bg-rarity-rare text-white',
  epic: 'bg-rarity-epic text-white',
  mythic: 'bg-rarity-mythic text-white',
};

export const normalizeCategory = (cat: string) => cat.replace(/\s*\(monde\)$/i, '');

export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ');

const COASTAL_DEPTS = new Set([
  '06', '11', '13', '14', '17', '22', '29', '30', '33', '34', '35', '40', '44', '50', '56', '59', '62', '64', '66', '76', '80', '83', '85', '2A', '2B', '971', '972', '973', '974', '976',
]);
const MOUNTAIN_DEPTS = new Set(['04', '05', '06', '09', '15', '25', '26', '31', '38', '39', '42', '43', '48', '63', '64', '65', '66', '67', '68', '73', '74', '88', '2A', '2B']);
const MEDITERRANEAN_DEPTS = new Set(['04', '05', '06', '11', '13', '30', '34', '66', '83', '84', '2A', '2B']);
const URBAN_DEPTS = new Set(['59', '69', '75', '92', '93', '94']);
const WETLAND_DEPTS = new Set(['01', '13', '17', '30', '33', '34', '35', '37', '41', '44', '45', '49', '51', '56', '67', '68', '80', '85']);
const OVERSEAS_DEPTS = new Set(['971', '972', '973', '974', '976']);

/**
 * Territoire = sélection courte d'espèces emblématiques (voir emblematicSpecies.ts).
 * Utilisé en repli quand la table serveur n'est pas encore peuplée.
 */
export const buildRegionalAnimalSet = (code: string, sourceAnimals: BestiaryAnimal[]) =>
  buildEmblematicSet(code, sourceAnimals);


// --- City filter: realistic urban/peri-urban subset ---
// Animals commonly observable in/around a French city (parcs, jardins, rues, toits, points d'eau).
const CITY_KEYWORDS = [
  // Oiseaux urbains
  'moineau', 'pigeon', 'tourterelle', 'merle', 'mésange', 'rougegorge', 'rouge-gorge', 'pinson', 'verdier', 'chardonneret', 'serin',
  'martinet', 'hirondelle', 'étourneau', 'pie', 'corneille', 'corbeau freux', 'choucas', 'geai', 'fauvette', 'pouillot',
  'grimpereau', 'sittelle', 'rossignol', 'perruche', 'faucon crécerelle', 'effraie', 'hulotte', 'goéland', 'mouette rieuse',
  'canard colvert', 'cygne', 'foulque', 'héron cendré', 'aigrette', 'cormoran',
  // Mammifères périurbains
  'écureuil', 'hérisson', 'renard', 'fouine', 'chauve-souris', 'pipistrelle', 'mulot', 'campagnol', 'rat', 'souris', 'lapin de garenne', 'belette',
  // Domestiques
  'chien', 'chat', 'cheval', 'âne', 'poule', 'canard', 'lapin', 'cobaye', 'hamster',
  // Insectes & araignées
  'abeille', 'bourdon', 'fourmi', 'coccinelle', 'papillon', 'paon-du-jour', 'citron', 'piéride', 'vulcain', 'belle-dame', 'machaon',
  'mouche', 'moustique', 'guêpe', 'frelon', 'syrphe', 'libellule', 'agrion', 'demoiselle', 'cigale', 'sauterelle', 'criquet',
  'perce-oreille', 'cloporte', 'mille-pattes', 'lépisme', 'punaise', 'gendarme', 'pucerons',
  'araignée', 'épeire', 'pholque', 'opilion',
  // Mollusques & autres
  'escargot', 'limace',
  // Reptiles/amphibiens urbains
  'lézard des murailles', 'gecko', 'orvet', 'crapaud commun', 'grenouille verte', 'triton palmé',
  // Poissons de bassin/parc
  'carpe', 'poisson rouge', 'gardon',
];

const CITY_EXCLUDE_KEYWORDS = [
  'aigle', 'vautour', 'gypaète', 'balbuzard', 'milan', 'circaète',
  'lynx', 'loup', 'ours', 'chamois', 'bouquetin', 'isard', 'marmotte', 'mouflon', 'cerf', 'élan',
  'sanglier', 'chevreuil', 'blaireau',
  'requin', 'baleine', 'dauphin', 'phoque', 'orque', 'cachalot', 'mérou', 'murène', 'raie', 'thon',
  'crabe', 'homard', 'langouste', 'crevette', 'oursin', 'étoile de mer', 'méduse',
  'flamant', 'pélican', 'frégate', 'fou de bassan',
  'tétras', 'lagopède', 'grand-duc', 'gélinotte',
  'salamandre', 'vipère', 'couleuvre',
];

/** Espèces emblématiques de ville : toujours conservées dans un territoire urbain. */
const CITY_ICONIC_KEYWORDS = [
  'pigeon', 'moineau domestique', 'merle noir', 'mésange charbonnière', 'mésange bleue',
  'pie bavarde', 'corneille noire', 'étourneau sansonnet', 'rougegorge familier',
  'perruche à collier', 'martinet noir', 'hirondelle de fenêtre', 'canard colvert',
  'mouette rieuse', 'goéland leucophée', 'foulque macroule', 'cygne tuberculé', 'héron cendré',
  'écureuil roux', 'renard roux', 'hérisson', 'rat surmulot', 'souris domestique',
  'pipistrelle commune', 'faucon crécerelle', 'chouette hulotte',
  'coccinelle à 7 points', 'abeille domestique', 'bourdon terrestre', 'gendarme',
  'papillon citron', 'vulcain', 'paon du jour', 'machaon',
  'escargot des jardins', 'cloporte commun', 'lézard des murailles',
];


export const buildCityAnimalSet = (deptSet: Set<string>, sourceAnimals: BestiaryAnimal[]) => {
  const capturedNames = new Set(
    sourceAnimals.filter((a) => a.captured).map((a) => a.name.toLowerCase()),
  );
  const selected = new Set<string>();

  sourceAnimals.forEach((animal) => {
    const key = animal.name.toLowerCase();
    if (!deptSet.has(key)) return;
    // Always keep what the user has already captured (preserves progression)
    if (capturedNames.has(key)) { selected.add(key); return; }
    const normalized = normalizeText(animal.name);
    if (CITY_EXCLUDE_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)))) return;
    if (CITY_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)))) {
      selected.add(key);
    }
  });

  // Target ~55 animals max for gamification (less = more achievable)
  const TARGET = 55;
  if (selected.size > TARGET) {
    // Iconic city species must never be trimmed away (alphabetical cuts used to drop them)
    const isIconic = (name: string) => {
      const n = normalizeText(name);
      return CITY_ICONIC_KEYWORDS.some((kw) => n.includes(normalizeText(kw)));
    };
    // Prefer commons & rares over epic/mythic when trimming
    const rank: Record<string, number> = { common: 0, rare: 1, epic: 2, mythic: 3 };
    const trimmed = sourceAnimals
      .filter((a) => selected.has(a.name.toLowerCase()))
      .sort((a, b) => {
        const ia = isIconic(a.name) ? 0 : 1;
        const ib = isIconic(b.name) ? 0 : 1;
        return ia - ib
          || (rank[a.rarity] ?? 4) - (rank[b.rarity] ?? 4)
          || a.name.localeCompare(b.name, 'fr');
      })
      .slice(0, TARGET)
      .map((a) => a.name.toLowerCase());
    return new Set(trimmed);
  }
  return selected;
};

