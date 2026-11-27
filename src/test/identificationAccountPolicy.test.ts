import { describe, expect, it } from 'vitest';
import { identificationAccountPolicy, IDENTIFICATION_PRIMARY_MODEL } from '../../supabase/functions/identify-animal/accountPolicy';

describe('identification account routing', () => {
  it('uses Gemini 3.8 Flash as the primary identification model', () => {
    expect(IDENTIFICATION_PRIMARY_MODEL).toBe('google/gemini-3.8-flash');
  });
  it('uses the stronger first pass for the requested demo account', () => {
    expect(identificationAccountPolicy('valentinmoulay+test@gmail.com')).toEqual({ demoAccount: true, boostedAccount: true });
  });
  it('preserves the existing internal account boost', () => {
    expect(identificationAccountPolicy('valentinmoulay@gmail.com')).toEqual({ demoAccount: false, boostedAccount: true });
  });
  it.each(['valentinmoulay+all@gmail.com', 'explorer@example.com', 'valentinmoulay+test@gmail.com.evil', null])('upgrades every account without granting demo status: %s', (email) => {
    expect(identificationAccountPolicy(email)).toEqual({ demoAccount: false, boostedAccount: true });
  });
});