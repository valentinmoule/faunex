import { supabase } from '@/integrations/supabase/client';
import { NATIVE_CALLBACK_URL } from './authRedirect';

/**
 * Connexion Apple dans l'app iOS native.
 *
 * La feuille Apple système émet toujours un jeton dont l'audience est l'App ID
 * (`com.faunex.faunex`), alors que le web utilise le Service ID
 * (`com.faunex.web`). Le provider Apple du backend ne pouvant accepter qu'une
 * seule audience, on échange le jeton via la fonction `apple-native-auth` qui
 * vérifie la signature Apple et autorise les deux audiences.
 */
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
      console.error('APPLE_NATIVE: identityToken manquant');
      return { error: new Error('Apple n’a pas renvoyé de jeton d’identité.') };
    }

    const fullName = [result.response.givenName, result.response.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const { data, error } = await supabase.functions.invoke<{
      token_hash?: string;
      email?: string;
      error?: string;
    }>('apple-native-auth', {
      body: { identity_token: identityToken, nonce, full_name: fullName || undefined },
    });

    if (error || !data?.token_hash) {
      console.error('APPLE_NATIVE: échange serveur en échec', {
        message: error?.message,
        serverError: data?.error,
      });
      return { error: new Error(data?.error || error?.message || 'Connexion Apple impossible.') };
    }

    const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: data.token_hash,
    });

    if (verifyError || !session.session) {
      console.error('APPLE_NATIVE: verifyOtp en échec', verifyError?.message);
      return { error: verifyError ?? new Error('Session Apple impossible à établir.') };
    }

    if (fullName) {
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
        .eq('user_id', session.session.user.id);
    }

    return {};
  } catch (error) {
    console.error('APPLE_NATIVE: exception du flow natif', {
      code: (error as any)?.code,
      error: (error as any)?.error,
      message: error instanceof Error ? error.message : String(error),
    });
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
};
