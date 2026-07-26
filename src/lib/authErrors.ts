/** Traduit les messages d'erreur d'authentification en français lisible. */
export const translateAuthError = (message?: string): string => {
  const m = (message || '').toLowerCase();

  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Un compte existe déjà avec cet email. Connecte-toi ou utilise « Mot de passe oublié ».';
  }
  if (m.includes('invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (m.includes('email not confirmed')) {
    return "Ton email n'est pas encore confirmé. Vérifie ta boîte mail (et tes spams).";
  }
  if (m.includes('pwned') || m.includes('known to be weak') || m.includes('compromised')) {
    return 'Ce mot de passe a déjà fuité sur internet. Choisis-en un autre, plus original.';
  }
  if (m.includes('password should be at least') || m.includes('password should contain')) {
    return 'Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return "Cette adresse email n'est pas valide.";
  }
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_email_send')) {
    return 'Trop de tentatives. Patiente une minute avant de réessayer.';
  }
  if (m.includes('database error saving new user')) {
    return "La création du compte a échoué. Réessaie dans un instant.";
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Connexion impossible. Vérifie ta connexion internet.';
  }
  if (m.includes('user not found')) {
    return "Aucun compte n'est associé à cet email.";
  }
  return message || 'Une erreur est survenue';
};

/** URL de retour pour les emails d'auth : reste sur le domaine courant. */
export const authRedirectUrl = (path = '') =>
  `${window.location.origin}${path}`;
