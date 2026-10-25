import { describe, expect, it } from 'vitest';
import { identificationAccountPolicy } from '../../supabase/functions/identify-animal/accountPolicy';

describe('identification account routing', () => {
  it('uses the stronger first pass for the requested demo account', () => {
    expect(identificationAccountPolicy('valentinmoulay+test@gmail.com')).toEqual({ demoAccount: true, boostedAccount: true });
  });
  it('preserves the existing internal account boost', () => {
    expect(identificationAccountPolicy('valentinmoulay@gmail.com')).toEqual({ demoAccount: false, boostedAccount: true });
  });
  it.each(['valentinmoulay+all@gmail.com', 'explorer@example.com', 'valentinmoulay+test@gmail.com.evil', null])('does not upgrade other accounts: %s', (email) => {
    expect(identificationAccountPolicy(email)).toEqual({ demoAccount: false, boostedAccount: false });
  });
});