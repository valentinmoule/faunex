import { describe, expect, it } from 'vitest';
import { REOBSERVATION_XP, captureXpForRarity } from '@/lib/shelveAnimation';

describe('XP des photos répétées', () => {
  it('ne prévoit aucun XP pour une espèce déjà capturée', () => {
    expect(REOBSERVATION_XP).toBe(0);
  });

  it('conserve le barème de première capture', () => {
    expect(captureXpForRarity('common')).toBe(50);
    expect(captureXpForRarity('hyper_rare')).toBe(550);
  });
});