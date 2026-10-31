// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AUTO_REVIEW_POLICY, completedUnderCurrentPolicy } from '../../supabase/functions/auto-moderate-capture/policy';

describe('Automatic review of current and future requests', () => {
  it('re-examines current requests handled under an older policy', () => {
    expect(completedUnderCurrentPolicy({ payload: null, decision_reason: 'needs_human' })).toBe(false);
  });
  it('does not repeatedly re-examine a completed review', () => {
    expect(completedUnderCurrentPolicy({ payload: { auto_review_policy: AUTO_REVIEW_POLICY }, decision_reason: 'needs_human' })).toBe(true);
  });
  it('allows a future attempt after an unavailable AI service', () => {
    expect(completedUnderCurrentPolicy({ payload: { auto_review_policy: AUTO_REVIEW_POLICY }, decision_reason: 'ai_unavailable:429' })).toBe(false);
  });
});