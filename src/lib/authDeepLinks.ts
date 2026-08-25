import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { IS_NATIVE_APP } from './platform';

/**
 * Gestion des deep links d'authentification sur mobile.
 *
 * Le SSO revient sur https://faunex.fr/auth/native-callback, qui rebascule
 * vers fr.faunex.app://auth/callback?... . On récupère ici le code ou les
 * tokens pour établir la session dans l'app, puis on nettoie l'URL.
 *
 * Robustesse : le même deep link peut arriver deux fois (appUrlOpen +
 * getLaunchUrl), on déduplique donc les URLs déjà traitées, et on ignore les
 * deep links sans donnée d'auth (test de scheme, ouverture manuelle).
 */
const handled = new Set<string>();

export const setupAuthDeepLinks = () => {
  if (!IS_NATIVE_APP) return;

  const closeBrowser = async () => {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.close();
    } catch {
      // Safari système ou vue déjà fermée : rien à faire.
    }
  };

  const handleUrl = async (rawUrl: string) => {
    if (handled.has(rawUrl)) return;
    handled.add(rawUrl);

    try {
      const url = new URL(rawUrl);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const get = (key: string) => url.searchParams.get(key) || hashParams.get(key);

      const accessToken = get('access_token');
      const refreshToken = get('refresh_token');
      const code = get('code');
      const authError = get('error_description') || get('error');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[FAUNEX][deeplink] setSession a échoué', error.message);
          return;
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[FAUNEX][deeplink] exchangeCodeForSession a échoué', error.message);
          return;
        }
      } else {
        if (authError) console.warn('[FAUNEX][deeplink] retour SSO en erreur :', authError);
        // Deep link sans donnée d'auth : on ferme juste le navigateur.
        await closeBrowser();
        return;
      }

      await closeBrowser();

      const target = url.pathname.includes('reset-password') ? '/reset-password' : '/home';
      window.history.replaceState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {
      console.error('[FAUNEX][deeplink] erreur de traitement', e);
    }
  };

  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void handleUrl(url);
  });

  void CapacitorApp.getLaunchUrl().then((launch) => {
    if (launch?.url) void handleUrl(launch.url);
  });
};
