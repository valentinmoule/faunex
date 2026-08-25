import { useEffect, useMemo, useState } from 'react';
import { NATIVE_DEEP_LINK } from '@/lib/authRedirect';

/**
 * Pont web -> app native.
 *
 * Le backend d'auth n'autorise que des URLs https de faunex.fr comme
 * redirection. Cette page reçoit donc le retour du SSO puis rebascule
 * vers l'app mobile via son deep link.
 *
 * IMPORTANT : cette page tourne dans Safari / SFSafariViewController, PAS dans
 * le conteneur Capacitor. iOS bloque les navigations vers un scheme applicatif
 * qui ne viennent pas d'un geste utilisateur : le bouton est donc affiché
 * immédiatement, et la redirection auto n'est qu'une tentative best-effort.
 */
const NativeAuthCallbackPage = () => {
  const [autoTried, setAutoTried] = useState(false);

  const target = useMemo(() => {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    return `${NATIVE_DEEP_LINK}${search}${hash}`;
  }, []);

  const debug = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return {
      href: window.location.href,
      hasCode: !!(search.get('code') || hash.get('code')),
      hasAccessToken: !!(search.get('access_token') || hash.get('access_token')),
      hasRefreshToken: !!(search.get('refresh_token') || hash.get('refresh_token')),
      error: search.get('error') || hash.get('error') || null,
      keys: [...search.keys(), ...hash.keys()].join(', ') || '(aucun paramètre)',
    };
  }, []);

  useEffect(() => {
    // DIAGNOSTIC : visible dans la console Safari (Développement > Simulateur).
    console.log('[FAUNEX][callback] URL reçue :', debug.href);
    console.log('[FAUNEX][callback] paramètres :', debug);
    console.log('[FAUNEX][callback] deep link cible :', target);

    const timer = window.setTimeout(() => {
      setAutoTried(true);
      window.location.href = target;
    }, 250);

    return () => window.clearTimeout(timer);
  }, [debug, target]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl">Retour vers l'app</h1>

      <p className="text-muted-foreground text-sm max-w-sm">
        Appuie sur le bouton ci-dessous pour revenir dans Faunex.
      </p>

      <a
        className="rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground"
        href={target}
      >
        Ouvrir Faunex
      </a>

      {/* Diagnostic deep link : lien sans paramètre, pour tester le scheme seul. */}
      <a className="text-xs underline text-muted-foreground" href={NATIVE_DEEP_LINK}>
        Tester le deep link seul (sans token)
      </a>

      <pre className="mt-4 max-w-full overflow-x-auto rounded-xl bg-muted p-3 text-left text-[10px] leading-relaxed text-muted-foreground">
{`auto tenté : ${autoTried}
code : ${debug.hasCode}
access_token : ${debug.hasAccessToken}
refresh_token : ${debug.hasRefreshToken}
error : ${debug.error ?? '—'}
params : ${debug.keys}
cible : ${target}`}
      </pre>
    </div>
  );
};

export default NativeAuthCallbackPage;
