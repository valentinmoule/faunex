import { describe, expect, it } from 'vitest';
import { isBoosterUnlocked } from './themedCollections';

describe('isBoosterUnlocked', () => {
  it('opens level-1 boosters for a new explorer', () => expect(isBoosterUnlocked(1, 1)).toBe(true));
  it('keeps a level-3 booster sealed at level 2', () => expect(isBoosterUnlocked(3, 2)).toBe(false));
  it('opens a level-3 booster at level 3', () => expect(isBoosterUnlocked(3, 3)).toBe(true));
  it.each([12, 16, 20, 25, 30, 40])('unlocks the later expedition exactly at level %i', (level) => {
    expect(isBoosterUnlocked(level, level - 1)).toBe(false);
    expect(isBoosterUnlocked(level, level)).toBe(true);
  });
});
