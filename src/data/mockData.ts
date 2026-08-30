export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'very_rare'
  | 'ultra_rare'
  | 'illustration_rare'
  | 'special_rare'
  | 'hyper_rare';

export interface AnimalCard {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  /** Approximate normalized (0..1) bounding box of the animal — used to mask the holo around the subject. */
  subjectBox?: { x: number; y: number; w: number; h: number } | null;
  rarity: Rarity;
  category: string;
  description: string;
  habitat: string;
  diet: string;
  conservation: string;
  funFact: string;
  discoveredAt: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  animal: AnimalCard;
  caption: string;
  likes: number;
  comments: number;
  liked: boolean;
  postedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  progress: number;
  total: number;
}

export interface UserProfile {
  name: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  xpToNext: number;
  speciesCount: number;
  totalCaptures: number;
  regionsExplored: number;
  followers: number;
  following: number;
  badges: Badge[];
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Plutôt rare',
  very_rare: 'Rare',
  ultra_rare: 'Ultra rare',
  illustration_rare: 'Épique',
  special_rare: 'Mythique',
  hyper_rare: 'Légendaire',
};

/** Ordre croissant de rareté (index = rang). */
export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'ultra_rare',
  'illustration_rare',
  'special_rare',
  'hyper_rare',
];

export const RARITY_RANK: Record<string, number> = Object.fromEntries(
  RARITY_ORDER.map((r, i) => [r, i]),
);

/** Symboles façon cartes Pokémon : ● ◆ ★ noirs, ★ argent, ★★ argent, ★ or. */
export const RARITY_SYMBOLS: Record<Rarity, string[]> = {
  common: ['●'],
  uncommon: ['◆'],
  rare: ['★'],
  very_rare: ['★'],
  ultra_rare: ['★', '★'],
  illustration_rare: ['★'],
  special_rare: ['★', '★'],
  hyper_rare: ['★', '★', '★'],
};

/** Famille d'effet visuel : neutre (encre), argent holo, or holo. */
export type RarityFx = 'ink' | 'silver' | 'gold';
export const RARITY_FX: Record<Rarity, RarityFx> = {
  common: 'ink',
  uncommon: 'ink',
  rare: 'ink',
  very_rare: 'silver',
  ultra_rare: 'silver',
  illustration_rare: 'gold',
  special_rare: 'gold',
  hyper_rare: 'gold',
};

/** Normalise les anciennes valeurs (caches, données legacy) vers le nouveau système. */
export const normalizeRarity = (r: string | null | undefined): Rarity => {
  switch (r) {
    case 'uncommon': case 'rare': case 'very_rare': case 'ultra_rare':
    case 'illustration_rare': case 'special_rare': case 'hyper_rare':
      return r;
    case 'epic': return 'ultra_rare';
    case 'legendary': return 'illustration_rare';
    case 'mythic': return 'special_rare';
    default: return 'common';
  }
};

export const mockCards: AnimalCard[] = [
  {
    id: '1',
    name: 'Renard roux',
    scientificName: 'Vulpes vulpes',
    image: '/images/fox.jpg',
    rarity: 'common',
    category: 'Mammifères',
    description: 'Le renard roux est le plus répandu des canidés sauvages. Rusé et adaptable, il prospère dans presque tous les habitats.',
    habitat: 'Forêts, plaines, zones urbaines',
    diet: 'Omnivore – petits rongeurs, fruits, insectes',
    conservation: 'Préoccupation mineure (LC)',
    funFact: 'Le renard utilise le champ magnétique terrestre pour chasser sous la neige !',
    discoveredAt: '2025-02-15',
    location: 'Forêt de Fontainebleau',
  },
  {
    id: '2',
    name: 'Martin-pêcheur',
    scientificName: 'Alcedo atthis',
    image: '/images/kingfisher.jpg',
    rarity: 'rare',
    category: 'Oiseaux',
    description: 'Petit oiseau au plumage spectaculaire, le martin-pêcheur plonge à grande vitesse pour capturer ses proies.',
    habitat: 'Rivières, lacs, zones humides',
    diet: 'Poissons, insectes aquatiques',
    conservation: 'Préoccupation mineure (LC)',
    funFact: 'Le design du Shinkansen japonais s\'inspire du bec du martin-pêcheur !',
    discoveredAt: '2025-02-10',
    location: 'Bords de Loire',
  },
  {
    id: '3',
    name: 'Faon (Chevreuil)',
    scientificName: 'Capreolus capreolus',
    image: '/images/deer.jpg',
    rarity: 'common',
    category: 'Mammifères',
    description: 'Le chevreuil est le plus petit cervidé européen. Gracieux et discret, il vit dans les forêts et lisières.',
    habitat: 'Forêts, bocages, prairies',
    diet: 'Herbivore – bourgeons, herbes, feuilles',
    conservation: 'Préoccupation mineure (LC)',
    funFact: 'Les faons naissent avec des taches blanches qui disparaissent en grandissant !',
    discoveredAt: '2025-01-28',
    location: 'Parc naturel du Vercors',
  },
  {
    id: '4',
    name: 'Rainette verte',
    scientificName: 'Hyla arborea',
    image: '/images/frog.jpg',
    rarity: 'common',
    category: 'Amphibiens',
    description: 'Petite grenouille arboricole au vert éclatant, capable de grimper sur les surfaces lisses grâce à ses ventouses.',
    habitat: 'Mares, haies, forêts humides',
    diet: 'Insectes, araignées',
    conservation: 'Préoccupation mineure (LC)',
    funFact: 'Elle peut changer de couleur selon la température et la lumière !',
    discoveredAt: '2025-02-18',
    location: 'Marais de Brière',
  },
  {
    id: '5',
    name: 'Harfang des neiges',
    scientificName: 'Bubo scandiacus',
    image: '/images/owl.jpg',
    rarity: 'ultra_rare',
    category: 'Oiseaux',
    description: 'Majestueux rapace de l\'Arctique, le harfang est l\'un des plus grands hiboux au monde.',
    habitat: 'Toundra arctique, plaines enneigées',
    diet: 'Lemmings, lièvres, oiseaux',
    conservation: 'Vulnérable (VU)',
    funFact: 'Contrairement à la plupart des hiboux, le harfang chasse en plein jour !',
    discoveredAt: '2025-01-05',
    location: 'Islande',
  },
  {
    id: '6',
    name: 'Loup gris',
    scientificName: 'Canis lupus',
    image: '/images/wolf.jpg',
    rarity: 'special_rare',
    category: 'Mammifères',
    description: 'Prédateur emblématique, le loup gris vit en meute organisée et joue un rôle clé dans les écosystèmes.',
    habitat: 'Forêts, montagnes, toundra',
    diet: 'Carnivore – cervidés, sangliers',
    conservation: 'Préoccupation mineure (LC) mais protégé en Europe',
    funFact: 'Un loup peut parcourir jusqu\'à 70 km en une seule nuit !',
    discoveredAt: '2025-02-20',
    location: 'Parc du Mercantour',
  },
];

export const mockFeed: FeedPost[] = [
  {
    id: 'f1',
    userId: 'u2',
    userName: 'Marie Dupont',
    userAvatar: '',
    animal: mockCards[1],
    caption: 'Incroyable rencontre au bord de la Loire ! Ce martin-pêcheur m\'a laissé l\'approcher 🐦✨',
    likes: 42,
    comments: 8,
    liked: false,
    postedAt: 'Il y a 2h',
  },
  {
    id: 'f2',
    userId: 'u3',
    userName: 'Lucas Martin',
    userAvatar: '',
    animal: mockCards[5],
    caption: 'JE N\'Y CROIS PAS. Un loup gris au Mercantour. Les mains tremblent encore. 🐺🔥',
    likes: 234,
    comments: 45,
    liked: true,
    postedAt: 'Il y a 5h',
  },
  {
    id: 'f3',
    userId: 'u4',
    userName: 'Sophie Bernard',
    userAvatar: '',
    animal: mockCards[0],
    caption: 'Ce petit renard curieux dans le brouillard matinal 🦊 Fontainebleau ne déçoit jamais.',
    likes: 67,
    comments: 12,
    liked: false,
    postedAt: 'Il y a 1j',
  },
  {
    id: 'f4',
    userId: 'u5',
    userName: 'Thomas Petit',
    userAvatar: '',
    animal: mockCards[4],
    caption: 'Voyage en Islande = harfang des neiges repéré ! Carte légendaire débloquée 🦉⭐',
    likes: 189,
    comments: 33,
    liked: true,
    postedAt: 'Il y a 2j',
  },
];

export const mockProfile: UserProfile = {
  name: 'Alex Moreau',
  username: '@alexnature',
  avatar: '',
  level: 12,
  xp: 2340,
  xpToNext: 3000,
  speciesCount: 47,
  totalCaptures: 128,
  regionsExplored: 8,
  followers: 234,
  following: 89,
  badges: [
    { id: 'b1', name: 'Explorateur', icon: '🧭', description: 'Découvrir 10 espèces', earned: true, progress: 10, total: 10 },
    { id: 'b2', name: 'Ornithologue', icon: '🐦', description: 'Photographier 15 oiseaux', earned: true, progress: 15, total: 15 },
    { id: 'b3', name: 'Naturaliste', icon: '🌿', description: 'Atteindre le niveau 10', earned: true, progress: 12, total: 10 },
    { id: 'b4', name: 'Globe-trotter', icon: '🌍', description: 'Explorer 10 régions', earned: false, progress: 8, total: 10 },
    { id: 'b5', name: 'Légende vivante', icon: '⭐', description: 'Trouver une espèce mythique', earned: true, progress: 1, total: 1 },
    { id: 'b6', name: 'Protecteur', icon: '🛡️', description: 'Photographier 5 espèces menacées', earned: false, progress: 3, total: 5 },
  ],
};
