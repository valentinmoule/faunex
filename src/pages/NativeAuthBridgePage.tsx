import { useEffect, useState } from 'react';
import { lovable } from '@/integrations/lovable/index';
import { NATIVE_CALLBACK_URL, WEB_ORIGIN } from '@/lib/authRedirect';
import LoadingScreen from '@/components/LoadingScreen';
import { useTranslation } from 'react-i18next';

const NativeAuthBridgePage = () => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = new URLSearchParams(window.location.search).get('provider');

    if (provider !== 'google' && provider !== 'apple') {
      setError(t('auth.nativeBridge.unknownProvider'));
      return;
    }

    // Le flow natif démarre toujours sur l'apex pour éviter un hop inutile.
    if (window.location.origin !== WEB_ORIGIN) {
      window.location.replace(`${WEB_ORIGIN}/auth/native-bridge?provider=${provider}`);
      return;
    }

    void lovable.auth
      .signInWithOAuth(provider, { redirect_uri: NATIVE_CALLBACK_URL })
      .then((result) => {
        if (result.error) {
          setError(t('auth.nativeBridge.connectionFailed'));
        }
      })
      .catch(() => {
        setError(t('auth.nativeBridge.connectionFailed'));
      });
  }, []);


  if (!error) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-2xl">{t('auth.nativeBridge.errorTitle')}</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        {error}
      </p>
    </div>
  );
};

export default NativeAuthBridgePage;