import { describe, it, expect } from 'vitest';
import { mergeRadarSources } from './radarSources';

const sighting = (name: string | null, sci: string | null = null) => ({
  animal_name: name, scientific_name: sci, category: 'Oiseaux', rarity: 'rare', lat: 48.86, lng: 2.39,
  distance_km: 1.2, seen_at: new Date().toISOString(), sightings: 2, locked: name === null,
});

describe('mergeRadarSources', () => {
  it('place les observations récentes avant les espèces potentielles', () => {
    const r = mergeRadarSources([sighting('Faucon pèlerin')], [{ name: 'Martin-pêcheur d\'Europe', scientific_name: 'Alcedo atthis' }]);
    expect(r.map((x) => x.kind)).toEqual(['sighting', 'potential']);
  });
  it('ne répète pas une espèce potentielle déjà vue récemment (nom ou nom scientifique)', () => {
    const r = mergeRadarSources(
      [sighting('Hérisson d\'Europe', 'Erinaceus europaeus')],
      [{ name: 'Herisson d’Europe' }, { name: 'Hérisson', scientific_name: 'Erinaceus europaeus' }, { name: 'Renard roux' }],
    );
    expect(r.map((x) => x.animal_name)).toEqual(['Hérisson d\'Europe', 'Renard roux']);
  });
  it('affiche les espèces potentielles seules quand personne n\'a rien vu', () => {
    const r = mergeRadarSources([], [{ name: 'Renard roux', tip: 'À l\'aube' }]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'potential', tip: 'À l\'aube', rarity: 'common' });
  });
});
