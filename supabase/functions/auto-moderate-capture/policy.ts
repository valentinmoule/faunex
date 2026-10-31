export const AUTO_REVIEW_POLICY = 'observer-canonical-v1';

/** Retry old decisions once under this policy, but never loop on uncertainty. */
export function completedUnderCurrentPolicy(event: { payload?: unknown; decision_reason?: string | null }) {
  const payload = event.payload as { auto_review_policy?: string } | null;
  return payload?.auto_review_policy === AUTO_REVIEW_POLICY &&
    !event.decision_reason?.startsWith('ai_unavailable:');
}