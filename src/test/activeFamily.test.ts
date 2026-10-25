import { describe, expect, it } from 'vitest';
import { hasActiveFamily, type FamilyInfo } from '@/lib/family';

const family: FamilyInfo = { id: 'family', owner_id: 'owner', active: true, environment: 'live', members: [], invitations: [] };

describe('Active family offer', () => {
  it('recognizes complimentary family access independently of personal billing', () => {
    expect(hasActiveFamily(family)).toBe(true);
  });
  it('does not mark an expired family as active', () => {
    expect(hasActiveFamily({ ...family, active: false })).toBe(false);
  });
  it('does not mark a personal-only account as family', () => {
    expect(hasActiveFamily(null)).toBe(false);
  });
});