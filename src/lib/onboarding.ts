// Visite guidée : vue une seule fois par compte.
// Les comptes créés après la sortie la voient automatiquement ; les anciens via une carte dans Mes captures.
export const ONBOARDING_LAUNCH = Date.parse('2026-11-25T00:00:00Z');
const KEY = 'faunex_onboarding_done';

export const isOnboardingDone = (userId: string) => {
  try { return !!localStorage.getItem(`${KEY}_${userId}`); } catch { return true; }
};
export const markOnboardingDone = (userId: string) => {
  try { localStorage.setItem(`${KEY}_${userId}`, '1'); } catch { /* ignore */ }
};
/** Compte créé après la sortie de la visite : ouverture automatique. */
export const isNewAccount = (createdAt?: string | null) =>
  !!createdAt && Date.parse(createdAt) >= ONBOARDING_LAUNCH;
