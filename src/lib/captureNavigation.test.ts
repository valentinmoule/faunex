import { describe, expect, it } from 'vitest';
import type { AnimalCard } from '@/data/mockData';
import { adjacentCaptureIndex, captureNavigationIndex, captureSwipeStep } from './captureNavigation';

describe('Capture navigation', () => {
  it('moves forward on a left swipe and backward on a right swipe', () => {
    expect(captureSwipeStep(-80, 5)).toBe(1);
    expect(captureSwipeStep(80, 5)).toBe(-1);
  });
  it('keeps the selected capture on a tap or vertical scroll', () => {
    expect(captureSwipeStep(15, 2)).toBe(0);
    expect(captureSwipeStep(-50, 90)).toBe(0);
  });
  it('does not wrap beyond the first or last capture', () => {
    expect(adjacentCaptureIndex(0, 3, -1)).toBeNull();
    expect(adjacentCaptureIndex(2, 3, 1)).toBeNull();
    expect(adjacentCaptureIndex(0, 3, 1)).toBe(1);
  });
  it('uses the displayed order and never navigates a capture outside the filtered list', () => {
    const captures = [{ id: 'third' }, { id: 'first' }] as AnimalCard[];
    expect(captureNavigationIndex(captures, captures[1])).toBe(1);
    expect(captureNavigationIndex(captures, { id: 'second' } as AnimalCard)).toBe(-1);
  });
});