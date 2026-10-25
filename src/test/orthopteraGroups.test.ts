import { describe, expect, it } from 'vitest';
import { getSpeciesGroup } from '@/lib/breedGroups';

describe('orthoptera collection after catalogue actualisation', () => {
  it.each([
    ['Dectique verrucivore', 'Decticus verrucivorus'],
    ['Œdipode germanique', 'Oedipoda germanica'],
    ['Œdipode turquoise', 'Oedipoda caerulescens'],
    ['Miramelle des moraines', 'Podisma pedestris'],
    ['Pyrgomorphe à tête conique', 'Pyrgomorpha conica'],
    ['Arcyptère bariolée', 'Arcyptera fusca'],
    ['Caloptène italien', 'Calliptamus italicus'],
    ['Sténobothre nain', 'Stenobothrus stigmaticus'],
    ['Aïolope automnale', 'Aiolopus strepens'],
    ['Truxale méditerranéenne', 'Acrida ungarica'],
    ['Pholidoptère cendrée', 'Pholidoptera griseoaptera'],
    ['Analote des Alpes', 'Anonconotus alpinus'],
    ['Troglophile cavicole', 'Troglophilus cavicola'],
    ['Yersinelle frêle', 'Yersinella raymondii'],
    ['Leptophye ponctuée', 'Leptophyes punctatissima'],
    ['Barbitiste des Pyrénées', 'Isophya pyrenaea'],
    ['Myrmécophile social', 'Myrmecophilus acervorum'],
  ])('%s stays in the orthoptera collection', (name, scientific) => {
    expect(getSpeciesGroup(name, scientific, 'Insectes')?.key).toBe('grasshoppers');
  });
  it('does not classify a fish with a similar vernacular name as an insect', () => {
    expect(getSpeciesGroup('Demoiselle à queue jaune', 'Chrysiptera parasema', 'Poissons')?.key).not.toBe('grasshoppers');
  });
});