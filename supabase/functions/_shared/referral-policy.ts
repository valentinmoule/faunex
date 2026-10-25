export const REFERRAL_DAYS = 30;
export const REFERRAL_ANNUAL_PRICE = 'faunex_premium_yearly';

export function qualifyingReferralPayment(data: {
  status?: string; origin?: string; subscriptionId?: string | null;
  details?: { totals?: { total?: string } } | null; items?: Array<{ price?: {
    importMeta?: { externalId?: string | null } | null; billingCycle?: { interval?: string; frequency?: number } | null;
  } | null }>;
}): boolean {
  return data.status === 'completed' && Boolean(data.subscriptionId)
    && data.origin !== 'subscription_recurring'
    && Number(data.details?.totals?.total ?? 0) > 0
    && data.items?.length === 1
    && data.items[0]?.price?.importMeta?.externalId === REFERRAL_ANNUAL_PRICE
    && data.items[0]?.price?.billingCycle?.interval === 'year'
    && data.items[0]?.price?.billingCycle?.frequency === 1;
}

export function referralBillingTarget(current: string, target: string): string {
  return new Date(Math.max(Date.parse(current), Date.parse(target))).toISOString();
}