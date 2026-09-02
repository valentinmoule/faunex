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
}

const KEY = 'faunex.catalogue.v5';
// Anciennes versions du cache : purgées pour éviter des noms d'espèces obsolètes.
try { ['faunex.catalogue.v1', 'faunex.catalogue.v2', 'faunex.catalogue.v3', 'faunex.catalogue.v4'].forEach((k) => localStorage.removeItem(k)); } catch { /* noop */ }
const TTL = 24 * 60 * 60 * 1000; // 24 h

type Row = [string, string, string, string];

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
      entries: p.r.map(([name, scientific_name, rarity, category]) => ({
        name,
        scientific_name: scientific_name || null,
        rarity,
        category: category || null,
      })),
    };
  } catch {
    return null;
  }
};

export const writeCatalogueCache = (entries: CatalogueEntry[], count: number) => {
  try {
    const payload: Payload = {
      t: Date.now(),
      c: count,
      r: entries.map((a) => [a.name, a.scientific_name || '', a.rarity, a.category || ''] as Row),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // quota dépassé : on ignore, le cache est purement optionnel
  }
};
