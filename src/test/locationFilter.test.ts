import { describe, expect, it } from 'vitest';
import { captureHasLocation, countByLocation, type LocationFilter } from '@/components/SpeciesSortFilter';

/** Une capture est « localisée » si elle a des coordonnées GPS ou un lieu saisi. */
const gps = { name: 'Renard roux', location: '', latitude: 48.85, longitude: 2.35 };
const typed = { name: 'Chevreuil', location: 'Corte, France', latitude: null, longitude: null };
const none = { name: 'Sauterelle', location: '', latitude: null, longitude: null };
const blank = { name: 'Mouche de terreau', location: '   ', latitude: undefined, longitude: undefined };

const list = [gps, typed, none, blank];

const keep = (locations: LocationFilter[]) =>
  list.filter((c) => locations.length === 0 || locations.includes(captureHasLocation(c) ? 'with' : 'without'));

describe('filtre localisation de Mon Faunex', () => {
  it('compte une espèce sans coordonnées ni lieu comme non localisée', () => {
    expect(captureHasLocation(none)).toBe(false);
    expect(captureHasLocation(blank)).toBe(false);
  });

  it('compte une espèce avec coordonnées ou lieu saisi comme localisée', () => {
    expect(captureHasLocation(gps)).toBe(true);
    expect(captureHasLocation(typed)).toBe(true);
  });

  it('« Sans localisation » ne garde que les espèces sans position', () => {
    expect(keep(['without']).map((c) => c.name)).toEqual(['Sauterelle', 'Mouche de terreau']);
  });

  it('« Avec localisation » exclut les espèces sans position', () => {
    expect(keep(['with']).map((c) => c.name)).toEqual(['Renard roux', 'Chevreuil']);
  });

  it('les deux options ou aucune ne filtrent rien', () => {
    expect(keep(['with', 'without'])).toHaveLength(4);
    expect(keep([])).toHaveLength(4);
  });

  it('les compteurs de la modale se répartissent avec / sans', () => {
    expect(countByLocation(list)).toEqual({ with: 2, without: 2 });
  });
});
