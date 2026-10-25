import { describe, expect, it } from 'vitest';
import { hasPersonalPremium, isBillingActive, isFamilyBilling } from '@/lib/premiumAccess';

const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe('isFamilyBilling', () => {
  it('recognizes only the two family prices', () => {
    expect(isFamilyBilling('faunex_premium_family_yearly')).toBe(true);
    expect(isFamilyBilling('faunex_premium_family_monthly')).toBe(true);
    expect(isFamilyBilling('faunex_premium_monthly_v2')).toBe(false);
    expect(isFamilyBilling(undefined)).toBe(false);
  });
});

describe('isBillingActive', () => {
  it('accepts an open active period and rejects an expired one', () => {
    expect(isBillingActive({ status: 'active', current_period_end: future })).toBe(true);
    expect(isBillingActive({ status: 'active', current_period_end: past })).toBe(false);
  });

  it('keeps access until the end of the period when the plan is canceled', () => {
    expect(isBillingActive({ status: 'canceled', current_period_end: future })).toBe(true);
    expect(isBillingActive({ status: 'canceled', current_period_end: past })).toBe(false);
  });
});

describe('hasPersonalPremium', () => {
  it('is true for the user’s own personal subscription', () => {
    expect(hasPersonalPremium({ id: '1', status: 'active', price_id: 'faunex_premium_monthly_v2', product_id: 'p', current_period_end: future, cancel_at_period_end: false })).toBe(true);
  });

  it('is false when the only billing row is the family subscription', () => {
    expect(hasPersonalPremium({ id: '1', status: 'active', price_id: 'faunex_premium_family_yearly', product_id: 'faunex_premium_family', current_period_end: future, cancel_at_period_end: false })).toBe(false);
  });

  it('is false without any billing row and true with referral bonus days', () => {
    expect(hasPersonalPremium(null, 0)).toBe(false);
    expect(hasPersonalPremium(null, 30)).toBe(true);
  });

  it('is false when the personal subscription already expired', () => {
    expect(hasPersonalPremium({ id: '1', status: 'active', price_id: 'faunex_premium_yearly', product_id: 'p', current_period_end: past, cancel_at_period_end: false })).toBe(false);
  });
});
