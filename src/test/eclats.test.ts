import { describe, expect, it } from 'vitest';
import { millisecondsUntilUtcMidnight, parseWallet } from '@/lib/economy/activity';

describe('Éclats UTC activity scheduler', () => {
  it('rolls over at UTC midnight rather than Paris midnight', () => {
    expect(millisecondsUntilUtcMidnight(new Date('2026-10-25T23:00:00+01:00'))).toBe(7_200_250);
  });
  it('reschedules one full UTC day after midnight', () => {
    expect(millisecondsUntilUtcMidnight(new Date('2026-10-26T00:00:00Z'))).toBe(86_400_250);
  });
  it('never accepts a negative available balance', () => {
    expect(parseWallet({ enabled: true, balance: -1 })).toBeNull();
    expect(parseWallet({ enabled: true, balance: 0, debt: 20, earned: 30 })).toEqual({ enabled: true, balance: 0, debt: 20, earned: 30 });
  });
});