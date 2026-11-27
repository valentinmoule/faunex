export const IDENTIFICATION_PRIMARY_MODEL = 'google/gemini-3.8-flash';

/** Only pass the email returned by server-side auth.getUser, never request fields. */
export function identificationAccountPolicy(authenticatedEmail?: string | null) {
  const email = (authenticatedEmail ?? '').trim().toLowerCase();
  const demoAccount = email === 'valentinmoulay+test@gmail.com';
  return {
    demoAccount,
    boostedAccount: true,
  };
}