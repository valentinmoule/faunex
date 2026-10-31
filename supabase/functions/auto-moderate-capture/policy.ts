export const AUTO_REVIEW_POLICY = 'observer-canonical-v1';

/** Cosmetic parentheses are not part of a scientific identity. */
export function scientificLabel(value: unknown): string | null {
  const label = String(value ?? '').trim().replace(/^\(([^()]+)\)$/, '$1').trim();
  return label || null;
}

/** Retry old decisions once under this policy, but never loop on uncertainty. */
export function completedUnderCurrentPolicy(event: { payload?: unknown; decision_reason?: string | null }) {
  const payload = event.payload as { auto_review_policy?: string } | null;
  return payload?.auto_review_policy === AUTO_REVIEW_POLICY &&
    !event.decision_reason?.startsWith('ai_unavailable:');
}