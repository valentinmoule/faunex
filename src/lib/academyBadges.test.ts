import { describe, expect, it } from 'vitest';
import { academyBadgeProgress, STATIC_BADGE_SEEDS } from './badges';

describe('Academy badge progress', () => {
  it('unlocks Curieux du vivant exactly at 5 completed lessons', () => {
    expect(academyBadgeProgress(4).academy_5).toBe(4);
    expect(academyBadgeProgress(5).academy_5).toBe(5);
  });

  it('unlocks Naturaliste érudit exactly at 25 completed lessons', () => {
    expect(academyBadgeProgress(24).academy_25).toBe(24);
    expect(academyBadgeProgress(25).academy_25).toBe(25);
  });

  it('caps displayed progress without reducing the underlying lesson count', () => {
    expect(academyBadgeProgress(404)).toEqual({ academy_5: 5, academy_25: 25 });
  });

  it('keeps the two rewards at 100 XP and 300 XP', () => {
    expect(STATIC_BADGE_SEEDS.find((badge) => badge.id === 'academy_5')).toMatchObject({ total: 5, xp: 100, group: 'progression' });
    expect(STATIC_BADGE_SEEDS.find((badge) => badge.id === 'academy_25')).toMatchObject({ total: 25, xp: 300, group: 'progression' });
  });
});
