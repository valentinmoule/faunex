import { Browser } from '@capacitor/browser';
import { IS_NATIVE_APP } from '@/lib/platform';

/** Fiches publiques de l'app sur chaque store (mêmes liens que le pied de page). */
export const APP_STORE_URL = 'https://apps.apple.com/fr/app/faunex/id6795586686';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=fr.faunex.app&pcampaignid=web_share';

/**
 * Appareil Apple ? Les iPad récents (iPadOS 13+) se font passer pour un Mac
 * desktop : le nombre de points tactiles les trahit.
 */
const isAppleDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
};

/** Fiche à ouvrir selon l'appareil de l'utilisateur. */
export const storeListingUrl = (): string => (isAppleDevice() ? APP_STORE_URL : PLAY_STORE_URL);

/** Ouvre la fiche de l'app sur le store adapté (navigateur système si app native). */
export const openStoreListing = async (): Promise<void> => {
  const url = storeListingUrl();
  if (IS_NATIVE_APP) {
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};
