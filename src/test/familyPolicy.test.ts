import {describe,it,expect} from 'vitest';
import {FAMILY_CAPACITY,FAMILY_INVITE_DAYS,FAMILY_PRICES,isFamilyPrice} from '../../supabase/functions/_shared/family-policy';
import {qualifyingReferralPayment} from '../../supabase/functions/_shared/referral-policy';
describe('Family offer rules',()=>{
  it('includes the manager in four accounts',()=>expect(FAMILY_CAPACITY).toBe(4));
  it('charges 40 euros yearly',()=>expect(FAMILY_PRICES.yearly.amount).toBe(4000));
  it('charges 4 euros monthly',()=>expect(FAMILY_PRICES.monthly.amount).toBe(400));
  it('expires invitations after seven days',()=>expect(FAMILY_INVITE_DAYS).toBe(7));
  it('does not classify individual purchases as family',()=>{expect(isFamilyPrice('faunex_premium_yearly')).toBe(false);expect(isFamilyPrice(FAMILY_PRICES.yearly.id)).toBe(true);});
  it('rewards family annual payments but not monthly',()=>{
    const payment=(plan:'yearly'|'monthly')=>({status:'completed',origin:'web',subscriptionId:'sub_paid',details:{totals:{total:String(FAMILY_PRICES[plan].amount)}},items:[{price:{importMeta:{externalId:FAMILY_PRICES[plan].id},billingCycle:{interval:plan==='yearly'?'year':'month',frequency:1}}}]});
    expect(qualifyingReferralPayment(payment('yearly'))).toBe(true);expect(qualifyingReferralPayment(payment('monthly'))).toBe(false);
  });
});