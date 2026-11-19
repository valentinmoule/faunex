/**
 * Résout l'espèce d'une collection personnalisée vers sa tuile du Bestiaire.
 * Le nom commun exact prime ; le nom scientifique ne sert que s'il désigne une
 * seule tuile, car les races domestiques partagent un binôme (Salers et
 * Abondance sont toutes deux Bos taurus).
 */
export function findCollectionTile<T extends { name: string; scientific_name?: string | null }>(
  animals: T[],
  animalName: string,
  scientificName?: string | null,
): T | undefined {
  const target = animalName.trim().toLocaleLowerCase('fr');
  const byName = animals.find((a) => a.name.trim().toLocaleLowerCase('fr') === target);
  if (byName) return byName;
  const sci = scientificName?.trim().toLowerCase();
  if (!sci) return undefined;
  const bySci = animals.filter((a) => a.scientific_name?.trim().toLowerCase() === sci);
  return bySci.length === 1 ? bySci[0] : undefined;
}
