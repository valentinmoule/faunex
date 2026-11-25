import {describe,it,expect} from 'vitest';
import {FAMILY_CAPACITY,FAMILY_INVITE_DAYS,FAMILY_PRICES,isFamilyPrice} from '../../supabase/functions/_shared/family-policy';
describe('Family offer rules',()=>{
  it('includes the manager in four accounts',()=>expect(FAMILY_CAPACITY).toBe(4));
  it('charges 60 euros yearly',()=>expect(FAMILY_PRICES.yearly.amount).toBe(6000));
  it('charges 6 euros monthly',()=>expect(FAMILY_PRICES.monthly.amount).toBe(600));
  it('expires invitations after seven days',()=>expect(FAMILY_INVITE_DAYS).toBe(7));
  it('does not classify individual purchases as family',()=>{expect(isFamilyPrice('faunex_premium_yearly')).toBe(false);expect(isFamilyPrice(FAMILY_PRICES.yearly.id)).toBe(true);});
});