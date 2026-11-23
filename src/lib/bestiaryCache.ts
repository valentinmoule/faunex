/**
 * Cache local du catalogue d'espèces (~5 000 lignes).
 *
 * Le catalogue bouge très peu : on le stocke en localStorage sous forme
 * compacte (tableaux de tuples) pour un affichage instantané au chargement,
 * puis on revalide en arrière-plan avec le nombre total d'espèces.
 */

export interface CatalogueEntry {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string | null;
  /** Numéro d'espèce fixé à la création de la fiche (N° affiché sur les cartes). */
  species_number?: number | null;
}

const KEY = 'faunex.catalogue.v29';
const deletionListeners = new Set<(name: string) => void>();

export function subscribeCatalogueDeletion(listener: (name: string) => void) {
  deletionListeners.add(listener);
  return () => { deletionListeners.delete(listener); };
}

export function removeCatalogueEntry(name: string) {
  const cached = readCatalogueCache();
  if (cached) {
    const entries = cached.entries.filter((entry) => entry.name !== name);
    writeCatalogueCache(entries, cached.count - (cached.entries.length - entries.length));
  }
  deletionListeners.forEach((listener) => listener(name));
}
// Anciennes versions du cache : purgées pour éviter des noms d'espèces obsolètes.
try { ['faunex.catalogue.v1', 'faunex.catalogue.v2', 'faunex.catalogue.v3', 'faunex.catalogue.v4', 'faunex.catalogue.v5', 'faunex.catalogue.v6', 'faunex.catalogue.v7', 'faunex.catalogue.v8', 'faunex.catalogue.v9', 'faunex.catalogue.v10', 'faunex.catalogue.v11', 'faunex.catalogue.v12', 'faunex.catalogue.v13', 'faunex.catalogue.v14', 'faunex.catalogue.v15', 'faunex.catalogue.v16', 'faunex.catalogue.v17', 'faunex.catalogue.v18', 'faunex.catalogue.v19', 'faunex.catalogue.v20', 'faunex.catalogue.v21', 'faunex.catalogue.v22', 'faunex.catalogue.v23', 'faunex.catalogue.v24', 'faunex.catalogue.v25', 'faunex.catalogue.v26', 'faunex.catalogue.v27', 'faunex.catalogue.v28'].forEach((k) => localStorage.removeItem(k)); } catch { /* noop */ }
const TTL = 24 * 60 * 60 * 1000; // 24 h

type Row = [string, string, string, string, number];

interface Payload {
  t: number;
  c: number;
  r: Row[];
}

export const readCatalogueCache = (): { entries: CatalogueEntry[]; count: number; fresh: boolean } | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Payload;
    if (!p?.r?.length) return null;
    return {
      count: p.c,
      fresh: Date.now() - p.t < TTL,
      entries: p.r.map(([name, scientific_name, rarity, category, species_number]) => ({
        name,
        scientific_name: scientific_name || null,
        rarity,
        category: category || null,
        species_number: typeof species_number === 'number' ? species_number : null,
      })),
    };
  } catch {
    return null;
  }
};

/**
 * Numéro d'espèce d'une fiche du catalogue local, retrouvé par nom commun exact.
 * Renvoie null quand la fiche n'est pas encore dans le cache (espèce toute neuve).
 */
export const findSpeciesNumber = (name: string): number | null => {
  const key = (name || '').trim().toLocaleLowerCase('fr');
  if (!key) return null;
  const cached = readCatalogueCache();
  if (!cached) return null;
  const hit = cached.entries.find((entry) => (entry.name || '').trim().toLocaleLowerCase('fr') === key);
  return hit?.species_number ?? null;
};

export const writeCatalogueCache = (entries: CatalogueEntry[], count: number) => {  try {
    const payload: Payload = {
      t: Date.now(),
      c: count,
      r: entries.map((a) => [a.name, a.scientific_name || '', a.rarity, a.category || '', a.species_number || 0] as Row),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // quota dépassé : on ignore, le cache est purement optionnel
  }
};
