/** Display only: ranking and rewards always retain the original numeric XP. */
export const formatLeaderboardXp = (xp: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(xp);