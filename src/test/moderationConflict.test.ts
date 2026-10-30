import { describe, expect, it } from 'vitest';
import { shouldRecheckModerationIdentity } from '../../supabase/functions/_shared/moderation-conflict';

describe('AI moderation identity recheck', () => {
  const conflict = { message: 'SPECIES_IDENTITY_CONFLICT: common and scientific names disagree' };
  it('rechecks a contradictory AI-generated pair', () => {
    expect(shouldRecheckModerationIdentity(false, conflict, false)).toBe(true);
  });
  it('never replaces an explicitly forced pair', () => {
    expect(shouldRecheckModerationIdentity(true, conflict, false)).toBe(false);
  });
  it('allows at most one paid recheck', () => {
    expect(shouldRecheckModerationIdentity(false, conflict, true)).toBe(false);
  });
  it('does not retry ambiguity or database outages as visual errors', () => {
    expect(shouldRecheckModerationIdentity(false, { message: 'AMBIGUOUS_SPECIES' }, false)).toBe(false);
    expect(shouldRecheckModerationIdentity(false, { message: 'connection timeout' }, false)).toBe(false);
    expect(shouldRecheckModerationIdentity(false, null, false)).toBe(false);
  });
});