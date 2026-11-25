import { describe, it, expect } from 'vitest';
import { adventStart, adventState, canOpenAdvent, defaultAdventDays, type AdventSubmission } from '@/lib/advent';

const submission = (patch: Partial<AdventSubmission> = {}): AdventSubmission => ({ id: 's', collection_id: 'c', day: 1, image_url: 'photo', approved_at: null, claimed_at: null, ...patch });
describe('Advent calendar rules', () => {
  it('keeps the visible collection inaccessible until December 1 Paris midnight', () => {
    expect(canOpenAdvent(2026, new Date('2026-10-25T16:40:00Z'))).toBe(false);
    expect(canOpenAdvent(2026, new Date('2026-11-30T22:59:59Z'))).toBe(false);
    expect(canOpenAdvent(2026, new Date('2026-11-30T23:00:00Z'))).toBe(true);
  });
  it('opens December 1 at midnight Paris time', () => {
    expect(adventStart(2026, 1).toISOString()).toBe('2026-11-30T23:00:00.000Z');
    expect(adventState(2026, 1, new Date('2026-11-30T22:59:59Z'), [])).toBe('locked');
    expect(adventState(2026, 1, new Date('2026-11-30T23:00:00Z'), [])).toBe('today');
  });
  it('allows catch-up of past days until the end of December 24', () => {
    expect(adventState(2026, 1, new Date('2026-12-01T22:59:59Z'), [])).toBe('today');
    expect(adventState(2026, 1, new Date('2026-12-01T23:00:00Z'), [])).toBe('catchup');
    expect(adventState(2026, 3, new Date('2026-12-24T22:59:59Z'), [])).toBe('catchup');
    expect(adventState(2026, 3, new Date('2026-12-24T23:00:00Z'), [])).toBe('missed');
  });
  it('closes the last day after December 24', () => {
    expect(adventState(2026, 24, new Date('2026-12-24T22:59:59Z'), [])).toBe('today');
    expect(adventState(2026, 24, new Date('2026-12-24T23:00:00Z'), [])).toBe('missed');
  });
  it('keeps on-time submissions pending after the deadline', () => {
    expect(adventState(2026, 1, new Date('2026-12-28T00:00:00Z'), [submission()])).toBe('pending');
  });
  it('accepts late moderation and preserves claimed state', () => {
    expect(adventState(2026, 1, new Date('2027-01-01T00:00:00Z'), [submission({ approved_at: '2026-12-29' })])).toBe('complete');
    expect(adventState(2026, 1, new Date('2027-01-01T00:00:00Z'), [submission({ approved_at: '2026-12-29', claimed_at: '2026-12-30' })])).toBe('claimed');
  });
  it('mixes 15 winter photo challenges, 4 gifts of 20 XP, 4 quizzes and the badge on the 24th', () => {
    const days = defaultAdventDays();
    expect(days).toHaveLength(24);
    expect(days.filter(d => d.kind === 'photo')).toHaveLength(15);
    expect(days.filter(d => d.kind === 'gift').map(d => d.xp)).toEqual([20, 20, 20, 20]);
    expect(days.filter(d => d.kind === 'quiz')).toHaveLength(4);
    expect(days[23].kind).toBe('badge');
    const winter = new Set(days.flatMap(d => d.categories));
    expect([...winter].every(c => c === 'Oiseaux' || c === 'Mammifères')).toBe(true);
  });
});