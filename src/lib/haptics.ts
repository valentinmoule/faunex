/**
 * Retour haptique léger (web app + apps natives Android via Vibration API).
 * iOS Safari n'expose pas navigator.vibrate : l'appel est simplement ignoré.
 */

const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Tic bref — clic sur une carte, ouverture d'un détail. */
export function hapticTap() {
  try {
    if (canVibrate()) navigator.vibrate(15);
  } catch {
    /* unsupported */
  }
}

/** Impulsion de confirmation — espèce identifiée avec succès. */
export function hapticSuccess() {
  try {
    if (canVibrate()) navigator.vibrate([30, 40, 50]);
  } catch {
    /* unsupported */
  }
}

/** Séquence de découverte — montée rapide puis impact lors du rangement. */
export function hapticDiscovery() {
  try {
    if (canVibrate()) navigator.vibrate([24, 35, 42, 45, 85]);
  } catch {
    /* unsupported */
  }
}
