/**
 * Second level inside the big categories: domestic species whose entries are breeds
 * (e.g. 102 dog breeds all share "Canis lupus familiaris").
 * Grouping is derived from the scientific name so no data migration is needed.
 */
export interface BreedGroup {
  key: string;
  label: string;
  emoji: string;
  /** Scientific names (lowercase) that belong to this group. */
  scientificNames: string[];
}

export const BREED_GROUPS: BreedGroup[] = [
  { key: 'dog', label: 'Races de chien', emoji: '🐕', scientificNames: ['canis lupus familiaris', 'canis familiaris'] },
  { key: 'cat', label: 'Races de chat', emoji: '🐈', scientificNames: ['felis catus', 'felis silvestris catus'] },
  { key: 'cattle', label: 'Races de vache', emoji: '🐄', scientificNames: ['bos taurus'] },
  { key: 'horse', label: 'Races de cheval', emoji: '🐎', scientificNames: ['equus caballus', 'equus ferus caballus'] },
  { key: 'chicken', label: 'Races de poule', emoji: '🐓', scientificNames: ['gallus gallus domesticus'] },
  { key: 'sheep', label: 'Races de mouton', emoji: '🐑', scientificNames: ['ovis aries'] },
  { key: 'goat', label: 'Races de chèvre', emoji: '🐐', scientificNames: ['capra hircus', 'capra aegagrus hircus'] },
  { key: 'rabbit', label: 'Races de lapin', emoji: '🐇', scientificNames: ['oryctolagus cuniculus', 'oryctolagus cuniculus domesticus'] },
  { key: 'duck', label: 'Races de canard', emoji: '🦆', scientificNames: ['anas platyrhynchos domesticus'] },
  { key: 'goose', label: "Races d'oie", emoji: '🪿', scientificNames: ['anser anser domesticus'] },
  { key: 'pig', label: 'Races de cochon', emoji: '🐖', scientificNames: ['sus scrofa domesticus'] },
  { key: 'donkey', label: "Races d'âne", emoji: '🫏', scientificNames: ['equus asinus', 'equus africanus asinus'] },
];

const GROUP_BY_SCIENTIFIC = new Map<string, BreedGroup>();
BREED_GROUPS.forEach((group) => {
  group.scientificNames.forEach((sn) => GROUP_BY_SCIENTIFIC.set(sn, group));
});

/** Returns the breed group of a species, or null when it is a regular wild species. */
export const getBreedGroup = (scientificName?: string | null): BreedGroup | null => {
  if (!scientificName) return null;
  return GROUP_BY_SCIENTIFIC.get(scientificName.trim().toLowerCase()) || null;
};

/** Minimum number of entries required before a breed group gets its own sub-level. */
export const MIN_BREEDS_PER_GROUP = 2;
