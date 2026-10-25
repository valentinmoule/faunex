import {describe,it,expect} from 'vitest';
import {canManageFamily,type FamilyInfo} from '@/lib/family';
const family:FamilyInfo={id:'family',owner_id:'payer',active:true,environment:'live',members:[],invitations:[]};
describe('Ma famille entry',()=>{
  it('is visible for the family payer',()=>expect(canManageFamily(family,'payer')).toBe(true));
  it('is hidden for an invited member',()=>expect(canManageFamily(family,'guest')).toBe(false));
  it('is hidden for Solo or unpaid accounts',()=>expect(canManageFamily(null,'solo')).toBe(false));
  it('is hidden without authentication',()=>expect(canManageFamily(family)).toBe(false));
});