import { describe, expect, it } from 'vitest';
import { formatLeaderboardXp } from '@/lib/formatLeaderboardXp';

describe('compact leaderboard XP', () => {
  it('keeps small totals exact', () => {
    expect(formatLeaderboardXp(540, 'fr')).toBe('540');
  });

  it('rounds large totals to one decimal in French', () => {
    expect(formatLeaderboardXp(160760, 'fr')).toBe('160,8\u00a0k');
    expect(formatLeaderboardXp(312510, 'fr')).toBe('312,5\u00a0k');
  });

  it('uses English number formatting for English accounts', () => {
    expect(formatLeaderboardXp(160760, 'en')).toBe('160.8K');
  });

  it('uses millions instead of an overflowing thousand count', () => {
    expect(formatLeaderboardXp(1250000, 'fr')).toBe('1,3\u00a0M');
  });
});