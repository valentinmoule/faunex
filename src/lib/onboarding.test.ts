import { describe, it, expect, beforeEach } from 'vitest';
import { isNewAccount, isOnboardingDone, markOnboardingDone } from './onboarding';

describe('onboarding', () => {
  beforeEach(() => localStorage.clear());
  it('shows once per account', () => {
    expect(isOnboardingDone('u1')).toBe(false);
    markOnboardingDone('u1');
    expect(isOnboardingDone('u1')).toBe(true);
    expect(isOnboardingDone('u2')).toBe(false);
  });
  it('opens automatically only for accounts created after launch', () => {
    expect(isNewAccount('2026-11-26T10:00:00Z')).toBe(true);
    expect(isNewAccount('2026-03-01T10:00:00Z')).toBe(false);
  });
});
