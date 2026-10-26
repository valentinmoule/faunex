export type Winner = { week_start: string; user_id: string; capture_id: string | null; votes: number; email_notified_at: string | null; push_notified_at: string | null }

export function winnerEventKey(winner: Pick<Winner, 'week_start' | 'user_id'>, channel: 'email' | 'push') {
  return `contest-winner-${winner.week_start}-${winner.user_id}-${channel}`
}

export async function notifyWinner(winner: Winner, handlers: {
  claim: (key: string) => Promise<boolean>
  email: (key: string) => Promise<boolean>
  push: (key: string) => Promise<boolean>
  complete: (channel: 'email' | 'push') => Promise<void>
}) {
  const result: Record<string, string> = {}
  for (const channel of ['email', 'push'] as const) {
    if (winner[`${channel}_notified_at`]) { result[channel] = 'already_notified'; continue }
    const key = winnerEventKey(winner, channel)
    if (!await handlers.claim(key)) { result[channel] = 'duplicate'; continue }
    try {
      if (await handlers[channel](key)) {
        await handlers.complete(channel)
        result[channel] = 'complete'
      } else result[channel] = 'failed'
    } catch { result[channel] = 'failed' }
  }
  return result
}