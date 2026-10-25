import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
const {open}=vi.hoisted(()=>({open:vi.fn().mockResolvedValue(undefined)}));
vi.mock('@capacitor/browser',()=>({Browser:{open}}));
vi.mock('@/lib/platform',()=>({IS_NATIVE_APP:true}));
vi.mock('@/lib/paddle',()=>({initializePaddle:vi.fn(),getPaddlePriceId:vi.fn()}));
import {usePaddleCheckout} from '@/hooks/usePaddleCheckout';
describe('Native Paddle checkout',()=>{
  it('opens family annual checkout externally with its verified intent',async()=>{
    const {result}=renderHook(()=>usePaddleCheckout());
    await act(async()=>result.current.openCheckout({priceId:'faunex_premium_family_yearly',plan:'yearly',customData:{userId:'account',familyIntentId:'verified-intent',referralId:'referral'}}));
    const url=new URL(open.mock.calls.at(-1)?.[0].url);
    expect(url.origin).toBe('https://faunex.fr');expect(url.pathname).toBe('/family');
    expect(url.searchParams.get('plan')).toBe('yearly');expect(url.searchParams.get('familyIntent')).toBe('verified-intent');
    expect(url.searchParams.get('uid')).toBe('account');expect(url.searchParams.get('referral')).toBe('referral');
  });
  it('keeps the Solo external checkout unchanged',async()=>{
    const {result}=renderHook(()=>usePaddleCheckout());
    await act(async()=>result.current.openCheckout({priceId:'faunex_premium_yearly',plan:'yearly',customData:{userId:'account'}}));
    const url=new URL(open.mock.calls.at(-1)?.[0].url);
    expect(url.pathname).toBe('/premium');expect(url.searchParams.has('familyIntent')).toBe(false);
  });
});