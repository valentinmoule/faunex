import { normalizeSpeciesSearch } from '@/lib/bestiary';

/** Une carte du radar : observation récente d'explorateur, ou espèce potentielle de la zone. */
export interface RadarItem {
  kind: 'sighting' | 'potential';
  animal_name: string | null; scientific_name: string | null; category: string | null; rarity: string;
  lat: number; lng: number; distance_km: number; seen_at: string; sightings: number; locked: boolean;
  tip?: string;
}

export interface PotentialSpecies { name: string | null; locked?: boolean; scientific_name?: string; category?: string; rarity?: string; tip?: string }

export const RADAR_LIMIT = 10;

/** Fusionne les deux sources en un seul deck de 10 cartes max : observations d'abord, puis potentielles non déjà listées. */
export function mergeRadarSources(sightings: Omit<RadarItem, 'kind'>[], potentials: PotentialSpecies[]): RadarItem[] {
  const out: RadarItem[] = sightings.map((s) => ({ ...s, kind: 'sighting' }));
  const seen = new Set<string>();
  out.forEach((s) => {
    if (s.animal_name) seen.add(normalizeSpeciesSearch(s.animal_name));
    if (s.scientific_name) seen.add(normalizeSpeciesSearch(s.scientific_name));
  });
  potentials.forEach((p) => {
    if (!p) return;
    if (!p.name) {
      if (p.locked) out.push({ kind: 'potential', animal_name: null, scientific_name: null, category: p.category ?? null, rarity: p.rarity || 'common', lat: NaN, lng: NaN, distance_km: NaN, seen_at: '', sightings: 0, locked: true });
      return;
    }
    const n = normalizeSpeciesSearch(p.name);
    const sn = p.scientific_name ? normalizeSpeciesSearch(p.scientific_name) : '';
    if (seen.has(n) || (sn && seen.has(sn))) return;
    seen.add(n); if (sn) seen.add(sn);
    out.push({
      kind: 'potential', animal_name: p.name, scientific_name: p.scientific_name ?? null, category: p.category ?? null,
      rarity: p.rarity || 'common', lat: NaN, lng: NaN, distance_km: NaN, seen_at: '', sightings: 0, locked: !!p.locked, tip: p.tip,
    });
  });
  return out.slice(0, RADAR_LIMIT);
}
