import { describe, expect, it } from 'vitest';
import { quizStars } from '@/lib/learning';
describe('quizStars', () => {
  it('gives 3 stars for a flawless lesson', () => expect(quizStars(5, 5)).toBe(3));
  it('gives 2 stars for one mistake', () => expect(quizStars(4, 5)).toBe(2));
  it('gives 1 star for two mistakes', () => expect(quizStars(3, 5)).toBe(1));
  it('gives 0 stars for three mistakes or more', () => expect(quizStars(2, 5)).toBe(0));
});
