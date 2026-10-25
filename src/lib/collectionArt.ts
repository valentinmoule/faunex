/**
 * Univers graphique des collections.
 *
 * Chaque collection (grande catégorie, groupe thématique ou territoire) reçoit
 * une photo immersive de son groupe ou biome + une teinte d'accent.
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
import marsh from '@/assets/collections/marsh.jpg';
import river from '@/assets/collections/river.jpg';
import reef from '@/assets/collections/reef.jpg';
import desert from '@/assets/collections/desert.jpg';
import savanna from '@/assets/collections/savanna.jpg';
import jungle from '@/assets/collections/jungle.jpg';
import cave from '@/assets/collections/cave.jpg';
import garden from '@/assets/collections/garden.jpg';
import dogs from '@/assets/collections/dogs.jpg';
import cats from '@/assets/collections/cats.jpg';
import horses from '@/assets/collections/horses.jpg';
import butterflies from '@/assets/collections/butterflies.jpg';
import ladybugs from '@/assets/collections/ladybugs.jpg';
import bees from '@/assets/collections/bees.jpg';
import dragonflies from '@/assets/collections/dragonflies.jpg';
import raptors from '@/assets/collections/raptors.jpg';
import passerines from '@/assets/collections/passerines.jpg';
import turtles from '@/assets/collections/turtles.jpg';
import sharks from '@/assets/collections/sharks.jpg';
import frogs from '@/assets/collections/frogs.jpg';
import salamanders from '@/assets/collections/salamanders.jpg';
import mushrooms from '@/assets/collections/mushrooms.jpg';
import rodents from '@/assets/collections/rodents.jpg';
import carnivores from '@/assets/collections/carnivores.jpg';

export type SceneKey =
  | 'city' | 'meadow' | 'lake' | 'forest' | 'ocean'
  | 'mountain' | 'farm' | 'night' | 'rocks' | 'coast'
  | 'marsh' | 'river' | 'reef' | 'desert' | 'savanna'
  | 'jungle' | 'cave' | 'garden';

export interface CollectionArt {
  image: string;
  /** Dégradé appliqué au-dessus de l'illustration (tokens HSL du design system). */
  overlay: string;
  /** Couleur dominante de l'illustration (HSL brut, ex. `150 45% 12%`). */
  tint: string;
  scene: SceneKey;
}

const SCENES: Record<SceneKey, string> = {
  city, meadow, lake, forest, ocean, mountain, farm, night, rocks, coast,
  marsh, river, reef, desert, savanna, jungle, cave, garden,
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
  marsh: '170 40% 14%',
  river: '195 50% 16%',
  reef: '180 55% 15%',
  desert: '28 60% 18%',
  savanna: '35 65% 20%',
  jungle: '160 55% 12%',
  cave: '225 25% 12%',
  garden: '330 30% 25%',
};

const overlayFor = (scene: SceneKey) =>
  `linear-gradient(to top, hsl(${TINTS[scene]} / 0.92) 0%, hsl(${TINTS[scene]} / 0.55) 45%, hsl(${TINTS[scene]} / 0.05) 100%)`;

/** Scène par grande catégorie (libellé normalisé du bestiaire). */
const CATEGORY_SCENES: Record<string, SceneKey> = {
  Insectes: 'meadow',
  Oiseaux: 'coast',
  Poissons: 'ocean',
  Reptiles: 'rocks',
  Amphibiens: 'marsh',
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
  // Races domestiques → la ferme (et ses alentours)
  dog: 'farm', cat: 'garden', cattle: 'farm', horse: 'meadow', chicken: 'farm',
  sheep: 'meadow', goat: 'mountain', rabbit: 'garden', 'duck-breed': 'lake',
  goose: 'marsh', pig: 'farm', donkey: 'meadow',
  // Insectes
  butterflies: 'garden', ladybugs: 'garden', dragonflies: 'marsh', bees: 'garden',
  ants: 'forest', beetles: 'forest', grasshoppers: 'meadow', bugs: 'meadow',
  cicadas: 'rocks', flies: 'meadow', 'stick-insects': 'jungle',
  cockroaches: 'cave', lacewings: 'night',
  // Oiseaux
  raptors: 'mountain', waterbirds: 'marsh', seabirds: 'coast', passerines: 'meadow',
  woodpeckers: 'forest', poultry: 'farm', pigeons: 'city', parrots: 'jungle',
  // Poissons
  sharks: 'ocean', 'freshwater-fish': 'river', seafish: 'ocean',
  'reef-fish': 'reef', seahorses: 'reef',
  // Reptiles / amphibiens
  snakes: 'rocks', lizards: 'desert', turtles: 'marsh', crocodiles: 'river',
  frogs: 'marsh', salamanders: 'forest',
  // Mollusques & crustacés
  snails: 'garden', slugs: 'forest', bivalves: 'coast', cephalopods: 'ocean',
  jellyfish: 'ocean', echinoderms: 'reef', worms: 'garden',
  crabs: 'coast', shrimps: 'reef', lobsters: 'ocean', isopods: 'cave',
  // Arachnides
  spiders: 'forest', scorpions: 'desert', ticks: 'meadow', harvestmen: 'forest',
  // Mammifères
  bats: 'cave', rodents: 'forest', carnivores: 'forest', ungulates: 'savanna',
  'marine-mammals': 'ocean', insectivores: 'meadow', primates: 'jungle', hares: 'meadow',
};

const build = (scene: SceneKey): CollectionArt => ({
  image: SCENES[scene],
  overlay: overlayFor(scene),
  tint: TINTS[scene],
  scene,
});

/** Photos propres à chaque groupe ; les scènes restent les accents et le repli. */
const GROUP_PHOTOS: Record<string, string> = {
  dog: dogs, cat: cats, horse: horses,
  butterflies, ladybugs, bees, dragonflies, raptors, passerines,
  turtles, sharks, frogs, salamanders, rodents, carnivores,
};

const CATEGORY_PHOTOS: Record<string, string> = {
  Champignons: mushrooms,
};

/** Illustration d'une collection à partir de sa clé (`cat:Oiseaux`, `butterflies`…). */
export const getCollectionArt = (key: string, label?: string): CollectionArt => {
  if (key.startsWith('cat:')) {
    const name = label || key.slice(4);
    const art = build(CATEGORY_SCENES[name] || 'forest');
    return { ...art, image: CATEGORY_PHOTOS[name] || art.image };
  }
  const art = build(GROUP_SCENES[key] || 'meadow');
  return { ...art, image: GROUP_PHOTOS[key] || art.image };
};

/** Illustration d'un territoire : ville dessinée, département en campagne. */
export const getZoneArt = (kind: 'department' | 'city'): CollectionArt =>
  build(kind === 'city' ? 'city' : 'meadow');
