import { IS_NATIVE_APP } from './platform';
import { nativeAuthBridgeUrl } from './authRedirect';

/**
 * Ouverture du pont d'auth Google depuis l'app native.
 * Apple iOS n'utilise plus ce pont : il passe par AuthenticationServices puis
 * `signInWithIdToken`, ce qui évite le callback web `form_post` du broker.
 */
export const openNativeAuthBridge = async (provider: 'google'): Promise<void> => {
  if (!IS_NATIVE_APP) return;

  const url = nativeAuthBridgeUrl(provider);

  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
};
