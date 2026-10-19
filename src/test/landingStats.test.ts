import { describe, expect, it } from 'vitest';
import { roundLandingStats, roundUp1000 } from '@/lib/landingStats';

describe('landing stats rounding', () => {
  it('rounds explorers up to the next thousand', () => {
    expect(roundUp1000(6745)).toBe(7000);
    expect(roundUp1000(6742)).toBe(7000);
  });

  it('rounds captures up to the next thousand', () => {
    expect(roundUp1000(84930)).toBe(85000);
    expect(roundUp1000(85005)).toBe(86000);
  });

  it('leaves an exact thousand untouched', () => {
    expect(roundUp1000(7000)).toBe(7000);
  });

  it('never understates the real count', () => {
    for (const n of [1, 999, 1001, 2410, 85005]) {
      expect(roundUp1000(n)).toBeGreaterThanOrEqual(n);
    }
  });

  it('rounds every figure of the stats block', () => {
    expect(
      roundLandingStats({ totalUsers: 6745, totalCaptures: 84930, speciesCount: 2410 })
    ).toEqual({ totalUsers: 7000, totalCaptures: 85000, speciesCount: 3000 });
  });
});
