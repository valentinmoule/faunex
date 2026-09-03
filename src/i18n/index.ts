import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Chaque domaine fonctionnel possède son propre fichier de ressources
// (src/i18n/locales/{fr,en}/<domaine>.json) ; ils sont fusionnés ici.
const frModules = import.meta.glob('./locales/fr/*.json', { eager: true }) as Record<string, any>;
const enModules = import.meta.glob('./locales/en/*.json', { eager: true }) as Record<string, any>;

const merge = (modules: Record<string, any>) =>
  Object.values(modules).reduce<Record<string, any>>(
    (acc, mod) => ({ ...acc, ...(mod.default ?? mod) }),
    {},
  );

const fr = merge(frModules);
const en = merge(enModules);

export type AppLocale = 'fr' | 'en';
export const SUPPORTED_LOCALES: AppLocale[] = ['fr', 'en'];
export const LOCALE_STORAGE_KEY = 'faunex.locale';

/**
 * Langue de l'appareil (device / navigateur). Dans les apps natives
 * Capacitor, `navigator.language` reflète les réglages système du téléphone,
 * ce qui permet la détection automatique demandée par les stores.
 */
export const detectDeviceLocale = (): AppLocale => {
  if (typeof navigator === 'undefined') return 'fr';
  const candidates = [navigator.language, ...(navigator.languages || [])];
  for (const tag of candidates) {
    const base = (tag || '').toLowerCase().split('-')[0] as AppLocale;
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }
  // Toute autre langue → anglais (langue internationale par défaut).
  return 'en';
};

/** Préférence explicite enregistrée par l'utilisateur, si elle existe. */
export const getStoredLocale = (): AppLocale | null => {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    return v && SUPPORTED_LOCALES.includes(v as AppLocale) ? (v as AppLocale) : null;
  } catch {
    return null;
  }
};

export const resolveInitialLocale = (): AppLocale => getStoredLocale() ?? detectDeviceLocale();

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: resolveInitialLocale(),
  fallbackLng: 'fr',
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Change la langue et la mémorise localement (persistance compte gérée à part). */
export const setAppLocale = (locale: AppLocale) => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* stockage indisponible */
  }
  i18n.changeLanguage(locale);
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
};

/** Efface la préférence manuelle : retour à la détection automatique. */
export const clearAppLocale = () => {
  try {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
  } catch {
    /* stockage indisponible */
  }
  const detected = detectDeviceLocale();
  i18n.changeLanguage(detected);
  if (typeof document !== 'undefined') document.documentElement.lang = detected;
};

if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;

export default i18n;
