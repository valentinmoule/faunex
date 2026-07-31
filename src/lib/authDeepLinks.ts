import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { IS_NATIVE_APP } from './platform';

/**
 * Gestion des deep links d'authentification sur mobile.
 *
 * Le SSO revient sur https://faunex.fr/auth/native-callback, qui rebascule
 * vers fr.faunex.app://auth/callback?... . On récupère ici le code ou les
 * tokens pour établir la session dans l'app, puis on nettoie l'URL.
 */
export const setupAuthDeepLinks = () => {
  if (!IS_NATIVE_APP) return;

  const handleUrl = async (rawUrl: string) => {
    try {
      const url = new URL(rawUrl);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

      const accessToken = hashParams.get('access_token') || url.searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || url.searchParams.get('refresh_token');
      const code = url.searchParams.get('code') || hashParams.get('code');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else {
        return;
      }

      const target = url.pathname.includes('reset-password') ? '/reset-password' : '/home';
      window.location.replace(`${window.location.origin}${target}`);
    } catch {
      // lien non lié à l'auth : on ignore
    }
  };

  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void handleUrl(url);
  });

  void CapacitorApp.getLaunchUrl().then((launch) => {
    if (launch?.url) void handleUrl(launch.url);
  });
};
