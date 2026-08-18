import { IS_NATIVE_APP } from './platform';

/**
 * Origine web publique de Faunex.
 * Sur mobile (Capacitor), `window.location.origin` vaut `capacitor://localhost`
 * ou `http://localhost` : ces origines ne sont pas autorisées par le backend
 * d'auth, ce qui provoquait une page 404 après un login SSO ou un lien email.
 */
export const WEB_ORIGIN = 'https://faunex.fr';

/** Schéma d'URL de l'app native (doit matcher l'appId Capacitor). */
export const NATIVE_SCHEME = 'fr.faunex.app';

/** URL du pont web qui renvoie vers l'app native après un login SSO. */
export const NATIVE_CALLBACK_URL = `${WEB_ORIGIN}/auth/native-callback`;

/** Deep link ouvert dans l'app native à la fin du flow d'auth. */
export const NATIVE_DEEP_LINK = `${NATIVE_SCHEME}://auth/callback`;

/**
 * Origine à utiliser pour toute redirection d'auth :
 * - web : l'origine courante (preview, prod, domaine custom)
 * - natif : le domaine public, jamais `localhost`
 */
export const authOrigin = (): string =>
  IS_NATIVE_APP ? WEB_ORIGIN : window.location.origin;

/** URL de retour pour les emails d'auth (confirmation, reset). */
export const buildAuthRedirectUrl = (path = ''): string => `${authOrigin()}${path}`;

/** redirect_uri à passer au SSO (Google / Apple). */
export const oauthRedirectUri = (): string =>
  IS_NATIVE_APP ? NATIVE_CALLBACK_URL : window.location.origin;

/**
 * Origine "www" du site.
 *
 * Le Return URL configuré chez Apple pointe sur `https://www.faunex.fr/~oauth/callback`.
 * Le broker OAuth (`/~oauth/initiate`) mémorise le `state`/PKCE sur l'hôte exact où
 * le flow démarre : si on initie sur `faunex.fr` alors qu'Apple renvoie (en POST
 * form_post) sur `www.faunex.fr`, l'hôte change et le state est perdu
 * → "Authorization failed / Missing state parameter".
 * On démarre donc le flow Apple directement sur `www.faunex.fr`.
 */
export const WWW_ORIGIN = 'https://www.faunex.fr';

/** Origine sur laquelle le flow OAuth doit démarrer, par provider. */
export const oauthInitiateOrigin = (provider: 'google' | 'apple'): string =>
  provider === 'apple' ? WWW_ORIGIN : WEB_ORIGIN;

/**
 * URL du pont web à ouvrir dans le navigateur système depuis l'app native.
 * Le broker OAuth (`/~oauth/initiate`) n'existe que sur le domaine public :
 * l'ouvrir depuis `capacitor://localhost` renvoyait une erreur de redirection.
 */
export const nativeAuthBridgeUrl = (provider: 'google' | 'apple'): string =>
  `${oauthInitiateOrigin(provider)}/auth/native-bridge?provider=${provider}`;

