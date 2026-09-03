import type { TFunction } from 'i18next';

/** Traduit les messages d'erreur d'authentification en texte lisible. */
export const translateAuthError = (message: string | undefined, t: TFunction): string => {
  const m = (message || '').toLowerCase();

  if (m.includes('user already registered') || m.includes('already been registered')) {
    return t('auth.errors.alreadyRegistered');
  }
  if (m.includes('invalid login credentials')) {
    return t('auth.errors.invalidCredentials');
  }
  if (m.includes('email not confirmed')) {
    return t('auth.errors.emailNotConfirmed');
  }
  if (m.includes('pwned') || m.includes('known to be weak') || m.includes('compromised')) {
    return t('auth.errors.pwnedPassword');
  }
  if (m.includes('password should be at least') || m.includes('password should contain')) {
    return t('auth.errors.weakPassword');
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return t('auth.errors.invalidEmail');
  }
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_email_send')) {
    return t('auth.errors.rateLimit');
  }
  if (m.includes('database error saving new user')) {
    return t('auth.errors.signupFailed');
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return t('auth.errors.network');
  }
  if (m.includes('user not found')) {
    return t('auth.errors.userNotFound');
  }
  return message || t('auth.errors.generic');
};

/** URL de retour pour les emails d'auth (domaine public sur mobile). */
export { buildAuthRedirectUrl as authRedirectUrl } from './authRedirect';
