/**
 * Détection de la cible de build.
 *
 * - Build web (par défaut) : site vitrine + blog + app
 * - Build natif (iOS / Android) : uniquement /auth et l'app connectée
 *
 * Activé soit par la variable d'env VITE_APP_TARGET=native au build,
 * soit automatiquement lorsque le code tourne dans un conteneur Capacitor.
 */
const envTarget = (import.meta.env.VITE_APP_TARGET as string | undefined)?.toLowerCase();

const runningInCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return !!cap && (typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : !!cap.isNative);
};

export const IS_NATIVE_APP = envTarget === 'native' || runningInCapacitor();

/** Plateforme Capacitor courante ('ios' | 'android' | 'web'). */
export const nativePlatform = (): string => {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  return typeof cap?.getPlatform === 'function' ? cap.getPlatform() : 'web';
};

/** true uniquement dans l'app iOS native (feuille Apple système disponible). */
export const IS_IOS_NATIVE = (): boolean => IS_NATIVE_APP && nativePlatform() === 'ios';

/** true quand les pages marketing (landing, guides, fonctionnalités) doivent être servies */
export const SHOW_MARKETING_PAGES = !IS_NATIVE_APP;
