import { describe, expect, it } from 'vitest';
import { convexHull, pickZoneSpecies, zoneToWkt } from '@/lib/zoneSpecies';

const tile = (name: string, scientific_name: string) => ({ name, scientific_name, category: 'Oiseaux', rarity: 'common', species_number: 1 });

describe('espèces d\'une zone de la carte', () => {
  it('trace un polygone antihoraire et fermé, comme l\'exige GBIF', () => {
    const hull = convexHull([[0, 0], [0, 1], [1, 1], [1, 0], [0.5, 0.5]]);
    expect(hull[0]).toEqual(hull[hull.length - 1]);
    expect(hull).toHaveLength(5);
    let area = 0;
    for (let i = 0; i < hull.length - 1; i++) area += hull[i][0] * hull[i + 1][1] - hull[i + 1][0] * hull[i][1];
    expect(area).toBeGreaterThan(0);
  });

  it('couvre tous les morceaux de la zone', () => {
    const wkt = zoneToWkt([
      { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      { type: 'Polygon', coordinates: [[[2, 0], [3, 0], [3, 1], [2, 0]]] },
    ]);
    expect(wkt).toContain('3 1');
    expect(wkt).toContain('0 0');
  });

  it('garde au plus 3 espèces, dans l\'ordre des observations', () => {
    const picked = pickZoneSpecies(
      [{ scientificName: 'Turdus merula', count: 90 }, { scientificName: 'Erithacus rubecula', count: 80 }, { scientificName: 'Pica pica', count: 70 }, { scientificName: 'Parus major', count: 60 }],
      [tile('Mésange charbonnière', 'Parus major'), tile('Merle noir', 'Turdus merula'), tile('Pie bavarde', 'Pica pica'), tile('Rouge-gorge familier', 'Erithacus rubecula')],
    );
    expect(picked.map((p) => p.name)).toEqual(['Merle noir', 'Rouge-gorge familier', 'Pie bavarde']);
  });

  it('écarte un nom scientifique partagé par plusieurs fiches (races)', () => {
    const picked = pickZoneSpecies(
      [{ scientificName: 'Gallus gallus domesticus', count: 50 }, { scientificName: 'Pica pica', count: 10 }],
      [tile('Poule soie', 'Gallus gallus domesticus'), tile('Poule sussex', 'Gallus gallus domesticus'), tile('Pie bavarde', 'Pica pica')],
    );
    expect(picked.map((p) => p.name)).toEqual(['Pie bavarde']);
  });
});
