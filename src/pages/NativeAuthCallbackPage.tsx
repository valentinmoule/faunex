import { useEffect, useMemo, useState } from 'react';
import { NATIVE_DEEP_LINK } from '@/lib/authRedirect';

/**
 * Pont web -> app native (fin du flow SSO).
 *
 * Cette page tourne dans le navigateur (Safari système pour Apple,
 * SFSafariViewController pour Google), PAS dans le conteneur Capacitor.
 * Elle ne fait donc qu'une chose : rebasculer vers l'app via son deep link
 * `fr.faunex.app://auth/callback` en conservant TOUS les paramètres reçus
 * (code ou tokens), que le backend les mette en query ou en hash.
 *
 * iOS peut refuser une navigation vers un scheme applicatif sans geste
 * utilisateur : le bouton est donc affiché immédiatement, la redirection
 * automatique n'est qu'une tentative best-effort.
 */
const NativeAuthCallbackPage = () => {
  const [autoTried, setAutoTried] = useState(false);

  const params = useMemo(() => {
    const search = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const get = (key: string) => search.get(key) || hash.get(key);
    return {
      code: get('code'),
      accessToken: get('access_token'),
      refreshToken: get('refresh_token'),
      error: get('error_description') || get('error'),
      count: [...search.keys(), ...hash.keys()].length,
    };
  }, []);

  /**
   * Le deep link est reconstruit à partir des paramètres réellement utiles :
   * on ne dépend plus de la présence de `search`/`hash` bruts (vides quand le
   * backend a livré les données autrement), ce qui évite d'envoyer à l'app un
   * deep link sans aucune information.
   */
  const target = useMemo(() => {
    const out = new URLSearchParams();
    if (params.code) out.set('code', params.code);
    if (params.accessToken) out.set('access_token', params.accessToken);
    if (params.refreshToken) out.set('refresh_token', params.refreshToken);
    if (params.error) out.set('error', params.error);
    const query = out.toString();
    return query ? `${NATIVE_DEEP_LINK}?${query}` : NATIVE_DEEP_LINK;
  }, [params]);

  const hasPayload = !!(params.code || (params.accessToken && params.refreshToken));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAutoTried(true);
      window.location.href = target;
    }, 200);
    return () => window.clearTimeout(timer);
  }, [target]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl">Retour vers Faunex</h1>

      <p className="text-muted-foreground text-sm max-w-sm">
        {hasPayload
          ? 'Connexion validée. Appuie sur le bouton pour revenir dans l\'app.'
          : params.error
            ? 'La connexion a été interrompue. Reviens dans l\'app et réessaie.'
            : 'Appuie sur le bouton pour revenir dans l\'app.'}
      </p>

      <a
        className="rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground"
        href={target}
        // rel/target volontairement absents : navigation directe vers le scheme.
      >
        Ouvrir Faunex
      </a>

      {!autoTried && <span className="sr-only">redirection en cours</span>}
    </div>
  );
};

export default NativeAuthCallbackPage;
