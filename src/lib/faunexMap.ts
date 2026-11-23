import type { StyleSpecification } from 'maplibre-gl';

/**
 * Carte Faunex : données réelles OpenStreetMap servies gratuitement par
 * OpenFreeMap (schéma OpenMapTiles), habillées aux couleurs Faunex.
 * Végétation, eau et routes viennent des données, rien n'est dessiné à la main.
 */
export const OPENFREEMAP_SOURCE = 'https://tiles.openfreemap.org/planet';
export const OPENFREEMAP_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

export type ZoneKind = 'forest' | 'grassland' | 'wetland' | 'water' | 'park' | 'sand' | 'farmland';

/** Calques touchables, du plus précis au plus large. */
export const ZONE_LAYERS: { id: string; kind: ZoneKind }[] = [
  { id: 'fx-park', kind: 'park' },
  { id: 'fx-wetland', kind: 'wetland' },
  { id: 'fx-water', kind: 'water' },
  { id: 'fx-forest', kind: 'forest' },
  { id: 'fx-sand', kind: 'sand' },
  { id: 'fx-grass', kind: 'grassland' },
];

export const zoneKindOfLayer = (layerId: string): ZoneKind | null =>
  ZONE_LAYERS.find((l) => l.id === layerId)?.kind ?? null;

/** Choisit la zone touchée la plus précise parmi les calques sous le doigt. */
export function pickZoneLayer<T extends { layer: { id: string } }>(features: T[]): T | null {
  for (const { id } of ZONE_LAYERS) {
    const hit = features.find((f) => f.layer.id === id);
    if (hit) return hit;
  }
  return null;
}

type Ring = number[][];
const inRing = (lng: number, lat: number, ring: Ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inPolygon = (lng: number, lat: number, rings: Ring[]) =>
  rings.length > 0 && inRing(lng, lat, rings[0]) && !rings.slice(1).some((h) => inRing(lng, lat, h));

/** Point (lng, lat) dans un polygone ou multipolygone GeoJSON (trous exclus). */
export function pointInGeometry(lng: number, lat: number, geometry: { type: string; coordinates: any } | null | undefined): boolean {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') return inPolygon(lng, lat, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates as Ring[][]).some((p) => inPolygon(lng, lat, p));
  return false;
}

const cssColor = (name: string, fallback: string) => {
  if (typeof document === 'undefined') return `hsl(${fallback})`;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${v || fallback})`;
};

/** Style vectoriel Faunex, couleurs lues dans les jetons --map-* du thème. */
export function buildFaunexMapStyle(): StyleSpecification {
  const c = {
    land: cssColor('--map-land', '40 45% 92%'),
    urban: cssColor('--map-urban', '36 30% 86%'),
    farmland: cssColor('--map-farmland', '44 42% 89%'),
    grass: cssColor('--map-grass', '100 40% 82%'),
    forest: cssColor('--map-forest', '105 38% 74%'),
    forestEdge: cssColor('--map-forest-edge', '110 30% 58%'),
    wetland: cssColor('--map-wetland', '160 30% 80%'),
    sand: cssColor('--map-sand', '42 60% 84%'),
    water: cssColor('--map-water', '203 70% 80%'),
    waterEdge: cssColor('--map-water-edge', '203 55% 68%'),
    road: cssColor('--map-road', '0 0% 100%'),
    roadEdge: cssColor('--map-road-edge', '36 20% 80%'),
    label: cssColor('--map-label', '30 10% 22%'),
    labelSoft: cssColor('--map-label-soft', '30 8% 40%'),
    boundary: cssColor('--map-boundary', '30 12% 62%'),
    selected: cssColor('--primary', '145 63% 42%'),
  };
  const src = 'openmaptiles';
  return {
    version: 8,
    glyphs: OPENFREEMAP_GLYPHS,
    sources: {
      [src]: { type: 'vector', url: OPENFREEMAP_SOURCE },
      'fx-selected': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'fx-land', type: 'background', paint: { 'background-color': c.land } },
      { id: 'fx-farmland', type: 'fill', source: src, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'farmland'], paint: { 'fill-color': c.farmland } },
      { id: 'fx-urban', type: 'fill', source: src, 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial', 'retail']]], paint: { 'fill-color': c.urban, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 0.9] } },
      { id: 'fx-sand', type: 'fill', source: src, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'sand'], paint: { 'fill-color': c.sand } },
      { id: 'fx-grass', type: 'fill', source: src, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'grass'], paint: { 'fill-color': c.grass } },
      { id: 'fx-wetland', type: 'fill', source: src, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wetland'], paint: { 'fill-color': c.wetland } },
      { id: 'fx-forest', type: 'fill', source: src, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': c.forest } },
      { id: 'fx-forest-trees', type: 'fill', source: src, 'source-layer': 'landcover', minzoom: 9, filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-pattern': 'fx-trees', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 0.9] } },
      { id: 'fx-forest-edge', type: 'line', source: src, 'source-layer': 'landcover', minzoom: 10, filter: ['==', ['get', 'class'], 'wood'], paint: { 'line-color': c.forestEdge, 'line-width': 1, 'line-opacity': 0.6 } },
      { id: 'fx-park', type: 'fill', source: src, 'source-layer': 'park', paint: { 'fill-color': c.grass, 'fill-opacity': 0.85, 'fill-outline-color': c.forestEdge } },
      { id: 'fx-water', type: 'fill', source: src, 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': c.water } },
      { id: 'fx-waterway', type: 'line', source: src, 'source-layer': 'waterway', filter: ['!=', ['get', 'brunnel'], 'tunnel'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.water, 'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 6, ['match', ['get', 'class'], 'river', 1.5, 0.3], 14, ['match', ['get', 'class'], 'river', 10, 2.5]] } },
      { id: 'fx-boundary', type: 'line', source: src, 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': c.boundary, 'line-width': 1.2, 'line-dasharray': [3, 2] } },
      { id: 'fx-road-edge', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 7, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.roadEdge, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 7, 1.6, 14, 9] } },
      { id: 'fx-road', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 5, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.road, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 5, ['match', ['get', 'class'], ['motorway', 'trunk'], 1, 0.3], 14, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 7, ['secondary', 'tertiary'], 4.5, 2.5]], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, ['match', ['get', 'class'], 'minor', 0, 1], 13, 1] } },
      { id: 'fx-selected-fill', type: 'fill', source: 'fx-selected', paint: { 'fill-color': c.selected, 'fill-opacity': 0.28 } },
      { id: 'fx-water-name', type: 'symbol', source: src, 'source-layer': 'water_name', layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': ['Noto Sans Italic'], 'text-size': 12 }, paint: { 'text-color': c.waterEdge, 'text-halo-color': c.land, 'text-halo-width': 1 } },
      { id: 'fx-park-name', type: 'symbol', source: src, 'source-layer': 'park', minzoom: 10, filter: ['has', 'name'], layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': ['Noto Sans Italic'], 'text-size': 11, 'text-max-width': 8 }, paint: { 'text-color': c.forestEdge, 'text-halo-color': c.land, 'text-halo-width': 1.2 } },
      { id: 'fx-place', type: 'symbol', source: src, 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]], layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, ['match', ['get', 'class'], 'city', 13, 'town', 11, 10], 10, ['match', ['get', 'class'], 'city', 19, 'town', 14, 12]], 'text-max-width': 8 }, paint: { 'text-color': ['match', ['get', 'class'], 'village', c.labelSoft, c.label], 'text-halo-color': c.land, 'text-halo-width': 1.6 } },
      { id: 'fx-country', type: 'symbol', source: src, 'source-layer': 'place', maxzoom: 6, filter: ['==', ['get', 'class'], 'country'], layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-transform': 'uppercase', 'text-letter-spacing': 0.1 }, paint: { 'text-color': c.labelSoft, 'text-halo-color': c.land, 'text-halo-width': 1.4 } },
    ],
  };
}

/** Petit motif de sapins pour les forêts (dessiné au chargement, aucune image externe). */
export function makeTreePattern(): { width: number; height: number; data: Uint8ClampedArray } | null {
  if (typeof document === 'undefined') return null;
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = cssColor('--map-forest-edge', '110 30% 58%');
  const tree = (x: number, y: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 4.5, y + 3);
    ctx.lineTo(x - 4.5, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 0.8, y + 3, 1.6, 2.5);
  };
  tree(12, 12);
  tree(36, 34);
  const img = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: img.data };
}
