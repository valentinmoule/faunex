import { supabase } from '@/integrations/supabase/client';
import { NATIVE_CALLBACK_URL } from './authRedirect';

const APPLE_NATIVE_CLIENT_ID = 'com.faunex.faunex';

const sha256Hex = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const safeRandomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  return Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const signInWithNativeApple = async (): Promise<{ error?: Error }> => {
  try {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    const nonce = safeRandomId();
    const hashedNonce = await sha256Hex(nonce);

    const result = await SignInWithApple.authorize({
      clientId: APPLE_NATIVE_CLIENT_ID,
      redirectURI: NATIVE_CALLBACK_URL,
      scopes: 'email name',
      state: safeRandomId(),
      nonce: hashedNonce,
    });

    const identityToken = result.response.identityToken;
    if (!identityToken) {
      return { error: new Error('Apple n’a pas renvoyé de jeton d’identité.') };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce,
    });

    if (error) return { error };

    const fullName = [result.response.givenName, result.response.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (data.user && fullName) {
      await supabase.auth.updateUser({
        data: {
          display_name: fullName,
          full_name: fullName,
          given_name: result.response.givenName,
          family_name: result.response.familyName,
        },
      });

      await supabase
        .from('profiles')
        .update({ display_name: fullName })
        .eq('user_id', data.user.id);
    }

    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
};