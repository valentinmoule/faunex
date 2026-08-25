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
      console.log('🔑 TOKENS FOUND', {
  hasAccessToken: !!accessToken,
  hasRefreshToken: !!refreshToken,
  hasCode: !!code,
});

  if (accessToken && refreshToken) {
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  console.log('🔥 SESSION RESULT', {
    user: data.session?.user?.email,
    error,
  });

} else if (code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log('🔥 CODE SESSION RESULT', {
    user: data.session?.user?.email,
    error,
  });

} else {
  console.log('❌ Aucun token/code dans le deep link');
  return;
}

      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close();
      } catch {
        // le navigateur système est peut-être déjà fermé
      }

    const target = url.pathname.includes('reset-password')
  ? '/reset-password'
  : '/home';

window.history.replaceState({}, '', target);
window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {
  console.error('❌ DEEP LINK ERROR', e);
}
  };

  // DIAGNOSTIC : on trace la réception (ou l'absence) d'URL côté JS et on la
  // garde en localStorage pour pouvoir la relire même après un reload.
  const trace = (label: string, url?: string | null) => {
    const line = `${new Date().toISOString()} ${label} ${url ?? '(aucune)'}`;
    console.log('[FAUNEX][deeplink][js]', line);
    try {
      const prev = JSON.parse(localStorage.getItem('faunex_deeplink_log') || '[]');
      localStorage.setItem('faunex_deeplink_log', JSON.stringify([...prev, line].slice(-10)));
    } catch {
      // localStorage indisponible : le console.log suffit
    }
  };

  trace('listener installé');

  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    trace('appUrlOpen', url);
    void handleUrl(url);
  });

  void CapacitorApp.getLaunchUrl().then((launch) => {
    trace('getLaunchUrl', launch?.url);
    if (launch?.url) void handleUrl(launch.url);
  });
};
