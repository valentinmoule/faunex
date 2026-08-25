import { IS_NATIVE_APP } from './platform';
import { nativeAuthBridgeUrl } from './authRedirect';

/**
 * Ouverture du pont d'auth SSO depuis l'app native.
 *
 * Deux navigateurs possibles sur iOS :
 *
 * 1. `@capacitor/browser` → SFSafariViewController (vue web *dans* l'app).
 *    Fonctionne pour Google, mais pas de façon fiable pour Apple : le retour
 *    d'Apple arrive via un `form_post` (navigation POST cross-origin), et iOS
 *    refuse alors d'ouvrir un scheme applicatif (`fr.faunex.app://`) depuis
 *    cette vue → l'utilisateur reste bloqué sur « Retour vers l'app ».
 *
 * 2. Safari système (`window.open(url, '_blank')`, que Capacitor transforme en
 *    `UIApplication.open`). Safari.app peut TOUJOURS ouvrir un scheme
 *    applicatif enregistré, y compris après un POST : c'est le seul chemin
 *    fiable pour terminer le flow Apple.
 *
 * On garde donc SFSafariViewController pour Google (comportement actuel,
 * fonctionnel) et on passe Apple par Safari système.
 */
export const openNativeAuthBridge = async (provider: 'google' | 'apple'): Promise<void> => {
  if (!IS_NATIVE_APP) return;

  const url = nativeAuthBridgeUrl(provider);

  if (provider === 'apple') {
    // Safari système : indispensable pour que le deep link de retour marche.
    const opened = window.open(url, '_blank');
    if (opened) return;
    // Si le navigateur bloque window.open, on retombe sur la vue in-app.
  }

  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
};
