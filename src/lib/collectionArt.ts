/**
 * Univers graphique des collections.
 *
 * Chaque collection (grande catégorie, groupe thématique ou territoire) reçoit
 * une illustration de biome dessinée dans un style unique et cohérent
 * (affiche naturaliste, gouache texturée) + une teinte d'accent.
 * L'illustration donne à chaque collection son identité visuelle propre.
 */
import city from '@/assets/collections/city.jpg';
import meadow from '@/assets/collections/meadow.jpg';
import lake from '@/assets/collections/lake.jpg';
import forest from '@/assets/collections/forest.jpg';
import ocean from '@/assets/collections/ocean.jpg';
import mountain from '@/assets/collections/mountain.jpg';
import farm from '@/assets/collections/farm.jpg';
import night from '@/assets/collections/night.jpg';
import rocks from '@/assets/collections/rocks.jpg';
import coast from '@/assets/collections/coast.jpg';

export type SceneKey =
  | 'city' | 'meadow' | 'lake' | 'forest' | 'ocean'
  | 'mountain' | 'farm' | 'night' | 'rocks' | 'coast';

export interface CollectionArt {
  image: string;
  /** Dégradé appliqué au-dessus de l'illustration (tokens HSL du design system). */
  overlay: string;
  scene: SceneKey;
}

const SCENES: Record<SceneKey, string> = {
  city, meadow, lake, forest, ocean, mountain, farm, night, rocks, coast,
};

/** Teintes d'accent par scène, en HSL brut pour composer les dégradés. */
const TINTS: Record<SceneKey, string> = {
  city: '30 45% 22%',
  meadow: '95 40% 20%',
  lake: '185 45% 16%',
  forest: '150 45% 12%',
  ocean: '205 60% 16%',
  mountain: '215 30% 20%',
  farm: '35 55% 20%',
  night: '230 45% 14%',
  rocks: '25 40% 22%',
  coast: '200 45% 20%',
};

const overlayFor = (scene: SceneKey) =>
  `linear-gradient(to top, hsl(${TINTS[scene]} / 0.92) 0%, hsl(${TINTS[scene]} / 0.55) 45%, hsl(${TINTS[scene]} / 0.05) 100%)`;

/** Scène par grande catégorie (libellé normalisé du bestiaire). */
const CATEGORY_SCENES: Record<string, SceneKey> = {
  Insectes: 'meadow',
  Oiseaux: 'coast',
  Poissons: 'ocean',
  Reptiles: 'rocks',
  Amphibiens: 'lake',
  Mollusques: 'ocean',
  Crustacés: 'coast',
  Arachnides: 'forest',
  Mammifères: 'forest',
  Arbres: 'forest',
  Plantes: 'meadow',
  Champignons: 'forest',
};

/** Scène par groupe thématique (clé de BREED_GROUPS). */
const GROUP_SCENES: Record<string, SceneKey> = {
  // Races domestiques → la ferme
  dog: 'farm', cat: 'farm', cattle: 'farm', horse: 'farm', chicken: 'farm',
  sheep: 'farm', goat: 'farm', rabbit: 'farm', 'duck-breed': 'lake',
  goose: 'lake', pig: 'farm', donkey: 'farm',
  // Insectes
  butterflies: 'meadow', ladybugs: 'meadow', dragonflies: 'lake', bees: 'meadow',
  ants: 'forest', beetles: 'forest', grasshoppers: 'meadow', bugs: 'meadow',
  cicadas: 'rocks', flies: 'meadow', 'stick-insects': 'rocks',
  cockroaches: 'forest', lacewings: 'night',
  // Oiseaux
  raptors: 'mountain', waterbirds: 'lake', seabirds: 'coast', passerines: 'meadow',
  woodpeckers: 'forest', poultry: 'farm', pigeons: 'city', parrots: 'forest',
  // Poissons
  sharks: 'ocean', 'freshwater-fish': 'lake', seafish: 'ocean',
  'reef-fish': 'ocean', seahorses: 'ocean',
  // Reptiles / amphibiens
  snakes: 'rocks', lizards: 'rocks', turtles: 'lake', crocodiles: 'lake',
  frogs: 'lake', salamanders: 'forest',
  // Mollusques & crustacés
  snails: 'forest', slugs: 'forest', bivalves: 'coast', cephalopods: 'ocean',
  jellyfish: 'ocean', echinoderms: 'ocean', worms: 'forest',
  crabs: 'coast', shrimps: 'coast', lobsters: 'ocean', isopods: 'forest',
  // Arachnides
  spiders: 'forest', scorpions: 'rocks', ticks: 'meadow', harvestmen: 'forest',
  // Mammifères
  bats: 'night', rodents: 'forest', carnivores: 'forest', ungulates: 'mountain',
  'marine-mammals': 'ocean', insectivores: 'meadow', primates: 'forest', hares: 'meadow',
};

const build = (scene: SceneKey): CollectionArt => ({
  image: SCENES[scene],
  overlay: overlayFor(scene),
  scene,
});

/** Illustration d'une collection à partir de sa clé (`cat:Oiseaux`, `butterflies`…). */
export const getCollectionArt = (key: string, label?: string): CollectionArt => {
  if (key.startsWith('cat:')) {
    const name = label || key.slice(4);
    return build(CATEGORY_SCENES[name] || 'forest');
  }
  return build(GROUP_SCENES[key] || 'meadow');
};

/** Illustration d'un territoire : ville dessinée, département en campagne. */
export const getZoneArt = (kind: 'department' | 'city'): CollectionArt =>
  build(kind === 'city' ? 'city' : 'meadow');
