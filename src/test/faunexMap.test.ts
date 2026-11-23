import { describe, it, expect } from 'vitest';
import { pointInGeometry, pickZoneLayer } from '@/lib/faunexMap';

const square = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };

describe('zones de la carte', () => {
  it('une capture dans la forêt est listée', () => {
    expect(pointInGeometry(2, 2, square)).toBe(true);
  });
  it('une capture hors de la zone ou dans une clairière (trou) ne l’est pas', () => {
    expect(pointInGeometry(12, 2, square)).toBe(false);
    expect(pointInGeometry(5, 5, square)).toBe(false);
  });
  it('un parc prime sur la forêt qui le contient', () => {
    const hit = pickZoneLayer([{ layer: { id: 'fx-forest' } }, { layer: { id: 'fx-park' } }]);
    expect(hit?.layer.id).toBe('fx-park');
  });
});
