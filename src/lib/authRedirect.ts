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

/** URL du pont web qui renvoie vers l'app native après un login SSO web. */
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

/** redirect_uri à passer au SSO web. */
export const oauthRedirectUri = (): string =>
  IS_NATIVE_APP ? NATIVE_CALLBACK_URL : window.location.origin;

/**
 * URL du pont web à ouvrir dans le navigateur système depuis l'app native.
 *
 * Google continue d'utiliser le broker web. Apple iOS utilise le flux natif
 * AuthenticationServices + signInWithIdToken, car le broker web perdait le
 * redirect final après le `form_post` Apple.
 *
 * Le flow démarre TOUJOURS sur l'apex `https://faunex.fr` : `www.faunex.fr`
 * redirige (301/302, et 307 en POST) vers l'apex, ce qui ajoute un hop inutile
 * et casse le POST `form_post` d'Apple. Le `state`/PKCE est stocké par le broker
 * (`oauth.lovable.app`), pas par notre domaine : l'hôte de départ n'a donc
 * aucune influence sur le state.
 */
export const nativeAuthBridgeUrl = (provider: 'google' | 'apple'): string =>
  `${WEB_ORIGIN}/auth/native-bridge?provider=${provider}`;


/**
 * Origine à utiliser pour tout lien partagé (profil, app).
 * Dans l'app native ou en local, on force le domaine public pour ne jamais
 * partager une URL `localhost` inutilisable par les destinataires.
 */
export const shareOrigin = (): string => {
  if (IS_NATIVE_APP) return WEB_ORIGIN;
  const { origin, hostname } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    !origin.startsWith('http');
  return isLocal ? WEB_ORIGIN : origin;
};
