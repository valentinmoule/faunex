import { describe, it, expect } from 'vitest';
import { qualifyingReferralPayment, referralBillingTarget, REFERRAL_DAYS } from '../../supabase/functions/_shared/referral-policy';

const annual = {
  status: 'completed', origin: 'web', subscriptionId: 'sub_paid',
  details: { totals: { total: '2400' } },
  items: [{ price: { importMeta: { externalId: 'faunex_premium_yearly' }, billingCycle: { interval: 'year', frequency: 1 } } }],
};
describe('Annual referral rules', () => {
  it('only rewards confirmed paid purchases', () => {
    expect(qualifyingReferralPayment(annual)).toBe(true);
    expect(qualifyingReferralPayment({ ...annual, status: 'pending' })).toBe(false);
    expect(qualifyingReferralPayment({ ...annual, details: { totals: { total: '0' } } })).toBe(false);
  });
  it('does not reward monthly subscriptions or renewals', () => {
    expect(qualifyingReferralPayment({ ...annual, origin: 'subscription_recurring' })).toBe(false);
    expect(qualifyingReferralPayment({ ...annual, items: [{ price: { importMeta: { externalId: 'faunex_premium_monthly' }, billingCycle: { interval: 'month', frequency: 1 } } }] })).toBe(false);
  });
  it('offers exactly 30 days', () => expect(REFERRAL_DAYS).toBe(30));
  it('billing retries do not add a second month or shorten the paid period', () => {
    expect(referralBillingTarget('2027-10-25T12:00:00Z', '2027-11-24T12:00:00Z')).toBe('2027-11-24T12:00:00.000Z');
    expect(referralBillingTarget('2027-11-24T12:00:00Z', '2027-11-24T12:00:00Z')).toBe('2027-11-24T12:00:00.000Z');
    expect(referralBillingTarget('2027-12-24T12:00:00Z', '2027-11-24T12:00:00Z')).toBe('2027-12-24T12:00:00.000Z');
  });
});