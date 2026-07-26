import type { ComponentType } from 'react';
import { PawPrint, Bird, Fish, Bug, Turtle, Shell, Waves } from 'lucide-react';
import { FrogIcon } from '@/components/icons/FrogIcon';
import type { AnimalCard } from '@/data/mockData';

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
  if (cat.includes('arachnide')) return Bug;
  if (cat.includes('crustacé')) return Shell;
  if (cat.includes('mollusque')) return Shell;
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

const BASE_DEPT_KEYWORDS = [
  'abeille', 'bourdon', 'fourmi', 'coccinelle', 'papillon', 'mouche', 'moustique', 'libellule', 'araignée', 'escargot', 'limace',
  'moineau', 'mésange', 'merle', 'rougegorge', 'pigeon', 'pie', 'corneille', 'étourneau', 'hirondelle', 'martinet', 'pinson', 'verdier', 'chardonneret',
  'hérisson', 'écureuil', 'renard', 'chevreuil', 'sanglier', 'lièvre', 'lapin', 'chauve-souris', 'fouine', 'belette', 'mulot', 'campagnol', 'rat', 'souris',
  'grenouille', 'crapaud', 'triton', 'salamandre', 'lézard', 'couleuvre', 'chien', 'chat', 'cheval', 'âne', 'vache', 'mouton', 'chèvre', 'poule', 'canard',
];

const getDeptKeywords = (code: string) => {
  const keywords = [...BASE_DEPT_KEYWORDS];
  if (COASTAL_DEPTS.has(code)) {
    keywords.push('goéland', 'mouette', 'cormoran', 'aigrette', 'héron', 'avocette', 'huîtrier', 'phoque', 'crabe', 'crevette', 'homard', 'moule', 'huître', 'bar', 'dorade', 'sardine', 'anchois', 'méduse', 'oursin', 'balane');
  }
  if (MOUNTAIN_DEPTS.has(code)) {
    keywords.push('aigle', 'vautour', 'marmotte', 'chamois', 'bouquetin', 'isard', 'mouflon', 'lynx', 'loup', 'tétras', 'lagopède', 'truite', 'apollon', 'accenteur alpin');
  }
  if (MEDITERRANEAN_DEPTS.has(code)) {
    keywords.push('flamant', 'cigale', 'gecko', 'tortue', 'lézard ocellé', 'couleuvre', 'rollier', 'guêpier', 'mérou', 'murène', 'dorade', 'sardine', 'anchois', 'scorpion');
  }
  if (URBAN_DEPTS.has(code)) {
    keywords.push('perruche', 'rat', 'souris', 'pigeon', 'moineau', 'martinet', 'corneille', 'pie', 'renard', 'hérisson', 'fouine', 'étourneau');
  }
  if (WETLAND_DEPTS.has(code)) {
    keywords.push('canard', 'cygne', 'foulque', 'grèbe', 'héron', 'aigrette', 'grenouille', 'triton', 'libellule', 'agrion', 'brochet', 'carpe', 'ablette');
  }
  if (OVERSEAS_DEPTS.has(code)) {
    keywords.push('iguane', 'gecko', 'tortue', 'colibri', 'pélican', 'frégate', 'crabe', 'crevette', 'dauphin', 'baleine', 'requin', 'raie', 'mérou', 'perroquet', 'caméléon');
  }
  return keywords.map(normalizeText);
};

export const buildRegionalAnimalSet = (code: string, sourceAnimals: BestiaryAnimal[]) => {
  const keywords = getDeptKeywords(code);
  const selected = new Set<string>();
  const localAnimals = sourceAnimals.filter((animal) => !animal.category.toLowerCase().includes('(monde)'));

  localAnimals.forEach((animal) => {
    const normalizedName = normalizeText(animal.name);
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      selected.add(animal.name.toLowerCase());
    }
  });

  const targetSize = OVERSEAS_DEPTS.has(code) ? 90 : 140;
  if (selected.size < targetSize) {
    localAnimals
      .filter((animal) => animal.rarity === 'common')
      .slice(0, targetSize - selected.size)
      .forEach((animal) => selected.add(animal.name.toLowerCase()));
  }

  return selected;
};

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
    // Prefer commons & rares over epic/mythic when trimming
    const rank: Record<string, number> = { common: 0, rare: 1, epic: 2, mythic: 3 };
    const trimmed = sourceAnimals
      .filter((a) => selected.has(a.name.toLowerCase()))
      .sort((a, b) => (rank[a.rarity] ?? 4) - (rank[b.rarity] ?? 4) || a.name.localeCompare(b.name, 'fr'))
      .slice(0, TARGET)
      .map((a) => a.name.toLowerCase());
    return new Set(trimmed);
  }
  return selected;
};
