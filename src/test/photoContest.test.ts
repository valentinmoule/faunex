import { describe, expect, it } from 'vitest';
import { contestErrorKey, currentContestWeekStart } from '@/hooks/usePhotoContest';

describe('capture of the week', () => {
  it('submission week starts Monday 00:00 Paris time', () => {
    // Wednesday 29 Oct 2026, 10:00 UTC → Monday 26 Oct 00:00 Paris (= 25 Oct 23:00 UTC, winter time)
    expect(currentContestWeekStart(new Date('2026-10-29T10:00:00Z')).toISOString()).toBe('2026-10-25T23:00:00.000Z');
  });
  it('Sunday night still belongs to the same week', () => {
    expect(currentContestWeekStart(new Date('2026-11-01T22:30:00Z')).toISOString()).toBe('2026-10-25T23:00:00.000Z');
  });
  it('maps the one-vote rule to its message', () => {
    expect(contestErrorKey('already_voted')).toBe('social.contest.errors.already_voted');
    expect(contestErrorKey('boom')).toBe('social.contest.errors.generic');
  });
});
