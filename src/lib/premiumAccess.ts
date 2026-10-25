import type { SubscriptionRow } from '@/hooks/useSubscription';

export const FAMILY_PRICE_IDS = ['faunex_premium_family_yearly', 'faunex_premium_family_monthly'] as const;

export function isFamilyBilling(priceId?: string | null): boolean {
  return typeof priceId === 'string' && (FAMILY_PRICE_IDS as readonly string[]).includes(priceId);
}

/** Mirrors the billing validity rule used by has_active_subscription()/family_valid(). */
export function isBillingActive(sub?: Pick<SubscriptionRow, 'status' | 'current_period_end'> | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? Date.parse(sub.current_period_end) : null;
  if (sub.status === 'active' || sub.status === 'trialing') return end === null || end > Date.now();
  return (sub.status === 'paused' || sub.status === 'past_due' || sub.status === 'canceled')
    && end !== null && end > Date.now();
}

/**
 * Personal Premium only: own subscription (never the family billing row) or an
 * unexpired referral bonus. Family membership must not light up the personal card.
 */
export function hasPersonalPremium(sub?: SubscriptionRow | null, bonusDays = 0): boolean {
  return bonusDays > 0 || (isBillingActive(sub) && !isFamilyBilling(sub?.price_id));
}
