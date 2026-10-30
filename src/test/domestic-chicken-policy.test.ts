import { describe, expect, it } from 'vitest';
import { isGenericDomesticChicken } from '../../supabase/functions/_shared/visual-identification-policy';

describe('domestic chicken identities', () => {
  it('rejects Poule et coq domestiques and generic variants', () => {
    for (const name of ['Poule et coq domestiques', 'Poule domestique et coq domestique', 'Coq et poule domestiques', 'Poule domestique', 'Coq domestique', 'Poule', 'Coq']) {
      expect(isGenericDomesticChicken(name)).toBe(true);
    }
  });
  it('preserves named breeds and distinct wild species', () => {
    for (const name of ['Poule Marans', 'Poule Coucou de Rennes', 'Coq Ayam Cemani', 'Gallinule poule d’eau', 'Coq-de-roche orange', 'Coq doré']) {
      expect(isGenericDomesticChicken(name)).toBe(false);
    }
  });
});