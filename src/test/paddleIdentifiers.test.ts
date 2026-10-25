import { describe, it, expect } from 'vitest';
import { isPaddleCustomerId, isPaddleSubscriptionId } from '../../supabase/functions/_shared/paddle-identifiers';
describe('Paddle portal identities', () => {
  it('rejects local grant customers', () => expect(isPaddleCustomerId('manual_fb53d7d5-d325-4ac7-8ff9-b95637e5a561')).toBe(false));
  it('rejects local grant subscriptions', () => expect(isPaddleSubscriptionId('manual_grant_fb53d7d5-d325-4ac7-8ff9-b95637e5a561_live')).toBe(false));
  it('accepts a real customer', () => expect(isPaddleCustomerId('ctm_01kzrf9h49qkmr2vkqrhfd31ek')).toBe(true));
  it('accepts a real subscription', () => expect(isPaddleSubscriptionId('sub_01kzrfb0rhnf9rg8yttfd5xhzg')).toBe(true));
});