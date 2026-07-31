import { useEffect, useState } from 'react';
import { lovable } from '@/integrations/lovable/index';
import { NATIVE_CALLBACK_URL } from '@/lib/authRedirect';
import LoadingScreen from '@/components/LoadingScreen';

/**
 * Pont d'authentification pour les apps natives.
 *
 * Dans l'app mobile, l'origine est `capacitor://localhost` : le chemin du
 * broker OAuth (`/~oauth/initiate`) n'existe pas localement, d'où l'erreur de
 * redirection. On ouvre donc cette page sur le domaine public depuis un
 * navigateur système : ici le broker est joignable, et le retour se fait sur
 * /auth/native-callback qui rebascule vers l'app via son deep link.
 */
const NativeAuthBridgePage = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = new URLSearchParams(window.location.search).get('provider');
    if (provider !== 'google' && provider !== 'apple') {
      setError("Fournisseur de connexion inconnu.");
      return;
    }

    void lovable.auth
      .signInWithOAuth(provider, { redirect_uri: NATIVE_CALLBACK_URL })
      .then((result) => {
        if (result.error) setError('La connexion a échoué. Reviens dans l\'app et réessaie.');
      })
      .catch(() => setError('La connexion a échoué. Reviens dans l\'app et réessaie.'));
  }, []);

  if (!error) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-2xl">Connexion impossible</h1>
      <p className="text-muted-foreground text-sm max-w-sm">{error}</p>
    </div>
  );
};

export default NativeAuthBridgePage;
