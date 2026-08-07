import { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { NATIVE_DEEP_LINK } from '@/lib/authRedirect';
import LoadingScreen from '@/components/LoadingScreen';

/**
 * Pont web -> app native.
 *
 * Le backend d'auth n'autorise que des URLs https de faunex.fr comme
 * redirection. Cette page reçoit donc le retour du SSO puis rebascule
 * immédiatement vers l'app mobile via son deep link.
 */
const NativeAuthCallbackPage = () => {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const target = `${NATIVE_DEEP_LINK}${search}${hash}`;

    console.log('APPLE CALLBACK SEARCH:', search);
    console.log('APPLE CALLBACK HASH:', hash);
    console.log('APPLE CALLBACK TARGET:', target);

    Browser.close().catch(() => {});

    const redirectTimer = window.setTimeout(() => {
      window.location.href = target;
    }, 300);

    const stuckTimer = window.setTimeout(() => {
      setStuck(true);
    }, 2500);

    return () => {
      window.clearTimeout(redirectTimer);
      window.clearTimeout(stuckTimer);
    };
  }, []);

  if (!stuck) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl">Retour vers l'app</h1>

      <p className="text-muted-foreground text-sm max-w-sm">
        Si Faunex ne s'est pas rouvert automatiquement, appuie sur le bouton ci-dessous.
      </p>

      <a
        className="rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground"
        href={`${NATIVE_DEEP_LINK}${window.location.search}${window.location.hash}`}
      >
        Ouvrir Faunex
      </a>
    </div>
  );
};

export default NativeAuthCallbackPage;