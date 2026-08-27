import { IS_NATIVE_APP } from './platform';
import { nativeAuthBridgeUrl } from './authRedirect';

/**
 * Ouverture du pont d'auth SSO depuis l'app native.
 * Google et Apple sur Android passent par ce pont web (Service ID
 * `com.faunex.web`). iOS utilise la feuille Apple système à la place.
 */
export const openNativeAuthBridge = async (provider: 'google' | 'apple'): Promise<void> => {
  if (!IS_NATIVE_APP) return;

  const url = nativeAuthBridgeUrl(provider);

  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
};
