import { supabase } from '@/integrations/supabase/client';
import { NATIVE_CALLBACK_URL } from './authRedirect';

const APPLE_NATIVE_CLIENT_ID = 'com.faunex.web';

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

    console.info('APPLE_NATIVE: authorize start', {
      clientId: APPLE_NATIVE_CLIENT_ID,
      nonceMode: 'sha256-to-apple/raw-to-backend',
    });

    const result = await SignInWithApple.authorize({
      clientId: APPLE_NATIVE_CLIENT_ID,
      redirectURI: NATIVE_CALLBACK_URL,
      scopes: 'email name',
      state: safeRandomId(),
      nonce: hashedNonce,
    });

    console.info('APPLE_NATIVE: authorize success', {
      hasResponse: Boolean(result.response),
      hasIdentityToken: Boolean(result.response.identityToken),
      hasAuthorizationCode: Boolean(result.response.authorizationCode),
      hasEmail: Boolean(result.response.email),
      hasName: Boolean(result.response.givenName || result.response.familyName),
    });

    const identityToken = result.response.identityToken;
    if (!identityToken) {
      console.error('APPLE_NATIVE: identityToken missing');
      return { error: new Error('Apple n’a pas renvoyé de jeton d’identité.') };
    }

    console.info('APPLE_NATIVE: identityToken received', {
      tokenParts: identityToken.split('.').length,
      tokenLength: identityToken.length,
    });

    console.info('APPLE_NATIVE: sending token to backend', {
      provider: 'apple',
      expectedAudience: APPLE_NATIVE_CLIENT_ID,
      nonceMode: 'raw',
    });

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce,
    });

    console.info('APPLE_NATIVE: backend response', {
      hasSession: Boolean(data.session),
      hasUser: Boolean(data.user),
      errorName: error?.name,
      errorMessage: error?.message,
      errorStatus: error?.status,
      errorCode: error?.code,
    });

    if (error) {
      console.error('APPLE_NATIVE: backend error', {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
      });
      return { error };
    }

    console.info('APPLE_NATIVE: session created', {
      userId: data.user?.id,
      hasSession: Boolean(data.session),
    });

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
    const errorJson = (() => {
      try {
        return JSON.stringify(error);
      } catch {
        return '[unserializable]';
      }
    })();
    console.error('APPLE_NATIVE: native flow exception', {
      raw: error,
      code: (error as any)?.code,
      error: (error as any)?.error,
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : String(error),
      json: errorJson,
    });
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
};