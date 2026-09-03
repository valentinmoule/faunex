/**
 * Shared i18n helpers for transactional & auth emails.
 * French is the source of truth (`profiles.locale` defaults to 'fr').
 */

export type Locale = 'fr' | 'en'

/** Normalizes any input (profiles.locale, header, etc.) to a supported Locale, defaulting to 'fr'. */
export function resolveLocale(value?: string | null): Locale {
  if (typeof value !== 'string') return 'fr'
  const normalized = value.trim().toLowerCase()
  return normalized.startsWith('en') ? 'en' : 'fr'
}

/** Picks the string matching the given locale, defaulting to 'fr'. */
export function pick<T>(strings: { fr: T; en: T }, locale?: Locale | string | null): T {
  return resolveLocale(locale as string | null | undefined) === 'en' ? strings.en : strings.fr
}

/**
 * Looks up the recipient's locale from `public.profiles.locale` using a
 * service-role Supabase client. Accepts a `userId` and/or an `email`
 * (resolved via `auth.admin`) — falls back to 'fr' on any miss/error.
 */
export async function resolveRecipientLocale(
  supabase: any,
  params: { userId?: string | null; email?: string | null },
): Promise<Locale> {
  try {
    let userId = params.userId ?? undefined

    if (!userId && params.email) {
      // No direct "get user by email" in the admin API used here; list + filter.
      const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, email: params.email })
      userId = data?.users?.[0]?.id
    }

    if (!userId) return 'fr'

    const { data: profile } = await supabase
      .from('profiles')
      .select('locale')
      .eq('user_id', userId)
      .maybeSingle()

    return resolveLocale(profile?.locale)
  } catch (error) {
    console.error('resolveRecipientLocale failed, defaulting to fr', error)
    return 'fr'
  }
}
