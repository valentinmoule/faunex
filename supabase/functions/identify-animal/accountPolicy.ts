/** Only pass the email returned by server-side auth.getUser, never request fields. */
export function identificationAccountPolicy(authenticatedEmail?: string | null) {
  const email = (authenticatedEmail ?? '').trim().toLowerCase();
  const demoAccount = email === 'valentinmoulay+test@gmail.com';
  return {
    demoAccount,
    boostedAccount: demoAccount || email === 'valentinmoulay@gmail.com',
  };
}