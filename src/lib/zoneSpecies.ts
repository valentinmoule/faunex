import { supabase } from '@/integrations/supabase/client';

/**
 * Espèces réellement observées dans une zone de la carte, d'après les
 * observations publiques GBIF (gratuit, sans clé), rattachées aux fiches du Bestiaire.
 */

type Position = number[];
type Geometry = { type: string; coordinates: any };

export interface ZoneSpecies {
  name: string;
  scientific_name: string;
  category: string;
  rarity: string;
  species_number: number | null;
  observations: number;
}

const HUMAN_KEY = '2436436';
const MAX_HULL_POINTS = 48;

const collectPoints = (geometry: Geometry, out: Position[]) => {
  if (geometry.type === 'Polygon') {
    (geometry.coordinates as Position[][]).forEach((ring) => out.push(...ring));
  } else if (geometry.type === 'MultiPolygon') {
    (geometry.coordinates as Position[][][]).forEach((poly) => poly.forEach((ring) => out.push(...ring)));
  }
};

const cross = (o: Position, a: Position, b: Position) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Enveloppe convexe dans le sens antihoraire (ordre exigé par GBIF), anneau fermé. */
export const convexHull = (points: Position[]): Position[] => {
  const pts = points
    .map((p) => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .filter((p, i, arr) => i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]);
  if (pts.length < 3) return [];
  const lower: Position[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Position[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  let hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  if (hull.length < 3) return [];
  if (hull.length > MAX_HULL_POINTS) {
    const step = hull.length / MAX_HULL_POINTS;
    hull = Array.from({ length: MAX_HULL_POINTS }, (_, i) => hull[Math.floor(i * step)]);
  }
  return [...hull, hull[0]];
};

/** Polygone WKT couvrant les morceaux de la zone touchée. */
export const zoneToWkt = (geometries: Geometry[]): string | null => {
  const pts: Position[] = [];
  geometries.forEach((g) => collectPoints(g, pts));
  const hull = convexHull(pts);
  if (!hull.length) return null;
  return `POLYGON((${hull.map((p) => `${p[0]} ${p[1]}`).join(',')}))`;
};

/** Garde les fiches dont le nom scientifique désigne une seule tuile (les races partagent un binôme). */
export const pickZoneSpecies = (
  ranked: { scientificName: string; count: number }[],
  tiles: Omit<ZoneSpecies, 'observations'>[],
  limit = 3,
): ZoneSpecies[] => {
  const byName = new Map<string, Omit<ZoneSpecies, 'observations'>[]>();
  tiles.forEach((tile) => {
    const key = tile.scientific_name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), tile]);
  });
  const picked: ZoneSpecies[] = [];
  for (const r of ranked) {
    const matches = byName.get(r.scientificName.trim().toLowerCase());
    if (matches?.length !== 1) continue;
    picked.push({ ...matches[0], observations: r.count });
    if (picked.length >= limit) break;
  }
  return picked;
};

const speciesNameCache = new Map<string, string | null>();

const resolveSpeciesKey = async (key: string, signal?: AbortSignal): Promise<string | null> => {
  if (speciesNameCache.has(key)) return speciesNameCache.get(key)!;
  try {
    const res = await fetch(`https://api.gbif.org/v1/species/${key}`, { signal });
    const json = res.ok ? await res.json() : null;
    const name = (json?.canonicalName || json?.species || null) as string | null;
    speciesNameCache.set(key, name);
    return name;
  } catch {
    return null;
  }
};

const zoneCache = new Map<string, ZoneSpecies[]>();

export const fetchZoneSpecies = async (geometries: Geometry[], signal?: AbortSignal): Promise<ZoneSpecies[]> => {
  const wkt = zoneToWkt(geometries);
  if (!wkt) return [];
  const cached = zoneCache.get(wkt);
  if (cached) return cached;

  const params = new URLSearchParams({
    geometry: wkt,
    kingdomKey: '1',
    hasGeospatialIssue: 'false',
    occurrenceStatus: 'PRESENT',
    limit: '0',
    facet: 'speciesKey',
    facetLimit: '20',
  });
  const res = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`, { signal });
  if (!res.ok) throw new Error(`gbif ${res.status}`);
  const json = await res.json();
  const counts: { name: string; count: number }[] = json?.facets?.[0]?.counts ?? [];
  const keys = counts.filter((c) => c.name !== HUMAN_KEY);
  const names = await Promise.all(keys.map((c) => resolveSpeciesKey(c.name, signal)));
  const ranked = keys
    .map((c, i) => ({ scientificName: names[i] ?? '', count: c.count }))
    .filter((r) => r.scientificName);
  if (!ranked.length) {
    zoneCache.set(wkt, []);
    return [];
  }

  const { data, error } = await supabase
    .from('animals')
    .select('name, scientific_name, category, rarity, species_number')
    .in('scientific_name', ranked.map((r) => r.scientificName));
  if (error) throw error;
  const tiles = (data ?? [])
    .filter((a) => a.scientific_name)
    .map((a) => ({
      name: a.name,
      scientific_name: a.scientific_name as string,
      category: a.category,
      rarity: a.rarity,
      species_number: (a as any).species_number ?? null,
    }));
  const result = pickZoneSpecies(ranked, tiles);
  zoneCache.set(wkt, result);
  return result;
};
