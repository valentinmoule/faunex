import { describe, expect, it } from 'vitest';
import { revealFinish } from '@/components/capture/RevealStage';

describe('revealFinish', () => {
  it('mythic captures (e.g. Gypaète barbu) get the iridescent reveal instead of crashing', () => {
    expect(revealFinish('special_rare')).toBe('iridescent');
  });
  it('legendary captures get the iridescent reveal', () => {
    expect(revealFinish('hyper_rare')).toBe('iridescent');
  });
  it('gold and plain tiers keep their finish', () => {
    expect(revealFinish('ultra_rare')).toBe('gold');
    expect(revealFinish('common')).toBe('plain');
  });
});
