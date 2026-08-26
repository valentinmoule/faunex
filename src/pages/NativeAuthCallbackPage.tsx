import { useEffect, useMemo, useState } from 'react';
import { NATIVE_DEEP_LINK } from '@/lib/authRedirect';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pont web -> app native (fin du flow SSO).
 *
 * Cette page tourne dans le navigateur système, PAS dans le conteneur
 * Capacitor. Elle ne fait qu'une chose : rebasculer vers l'app via son deep
 * link `fr.faunex.app://auth/callback` en conservant les données d'auth.
 *
 * Attention : le client Supabase de l'app (detectSessionInUrl activé par
 * défaut) consomme et nettoie le `#access_token=...` dès son initialisation.
 * Les paramètres d'URL sont donc souvent déjà absents quand cette page se
 * monte. On lit alors la session Supabase établie dans ce navigateur pour
 * reconstruire le deep link avec les tokens : sans ça, l'app native recevait
 * un deep link vide et restait sur l'écran de connexion.
 */
const NativeAuthCallbackPage = () => {
  const [autoTried, setAutoTried] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const get = (key: string) => search.get(key) || hash.get(key);
    return {
      code: get('code'),
      accessToken: get('access_token'),
      refreshToken: get('refresh_token'),
      error: get('error_description') || get('error'),
    };
  }, []);

  const buildTarget = (data: {
    code?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    error?: string | null;
  }) => {
    const out = new URLSearchParams();
    if (data.accessToken && data.refreshToken) {
      out.set('access_token', data.accessToken);
      out.set('refresh_token', data.refreshToken);
    } else if (data.code) {
      out.set('code', data.code);
    }
    if (!out.toString() && data.error) out.set('error', data.error);
    const query = out.toString();
    return query ? `${NATIVE_DEEP_LINK}?${query}` : NATIVE_DEEP_LINK;
  };

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      // 1. Données présentes dans l'URL : on les transmet directement.
      if (params.code || (params.accessToken && params.refreshToken)) {
        return buildTarget(params);
      }

      // 2. Sinon, la session a peut-être déjà été établie dans ce navigateur
      //    (tokens consommés depuis le hash par le client Supabase).
      for (let attempt = 0; attempt < 12; attempt++) {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (session?.access_token && session?.refresh_token) {
          return buildTarget({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
        }
        if (cancelled) return null;
        await new Promise((r) => window.setTimeout(r, 250));
      }

      return buildTarget(params);
    };

    void resolve().then((url) => {
      if (cancelled || !url) return;
      setTarget(url);
      setAutoTried(true);
      window.location.href = url;
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  const hasPayload = target ? target.includes('access_token=') || target.includes('code=') : false;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl">Retour vers Faunex</h1>

      <p className="text-muted-foreground text-sm max-w-sm">
        {!target
          ? 'Finalisation de la connexion…'
          : hasPayload
            ? 'Connexion validée. Appuie sur le bouton pour revenir dans l\'app.'
            : params.error
              ? 'La connexion a été interrompue. Reviens dans l\'app et réessaie.'
              : 'Appuie sur le bouton pour revenir dans l\'app.'}
      </p>

      {target && (
        <a
          className="rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground"
          href={target}
          // rel/target volontairement absents : navigation directe vers le scheme.
        >
          Ouvrir Faunex
        </a>
      )}

      {!autoTried && <span className="sr-only">redirection en cours</span>}
    </div>
  );
};

export default NativeAuthCallbackPage;
