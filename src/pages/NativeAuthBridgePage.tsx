import { useEffect, useState } from 'react';
import { lovable } from '@/integrations/lovable/index';
import { NATIVE_CALLBACK_URL, WEB_ORIGIN } from '@/lib/authRedirect';
import LoadingScreen from '@/components/LoadingScreen';

const NativeAuthBridgePage = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = new URLSearchParams(window.location.search).get('provider');

    if (provider !== 'google' && provider !== 'apple') {
      setError("Fournisseur de connexion inconnu.");
      return;
    }

    // Le broker garde le state/PKCE sur l'hôte où le flow démarre.
    // Apple renvoie sur www.faunex.fr : on s'assure d'être sur le bon hôte
    // AVANT d'appeler /~oauth/initiate, sinon le state est perdu au retour.
    const expectedOrigin = oauthInitiateOrigin(provider);
    if (window.location.origin !== expectedOrigin) {
      window.location.replace(`${expectedOrigin}/auth/native-bridge?provider=${provider}`);
      return;
    }

    console.log('🔥 START OAUTH', provider, NATIVE_CALLBACK_URL, window.location.origin);

    void lovable.auth
      .signInWithOAuth(provider, { redirect_uri: NATIVE_CALLBACK_URL })
      .then((result) => {
        console.log('🔥 OAUTH RESULT', result);

        if (result.error) {
          setError('La connexion a échoué. Reviens dans l\'app et réessaie.');
        }
      })
      .catch((err) => {
        console.log('🔥 OAUTH ERROR', err);
        setError('La connexion a échoué. Reviens dans l\'app et réessaie.');
      });
  }, []);


  if (!error) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-2xl">Connexion impossible</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        {error}
      </p>
    </div>
  );
};

export default NativeAuthBridgePage;