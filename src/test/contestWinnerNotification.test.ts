import { describe, it, expect } from 'vitest'
import { notifyWinner, winnerEventKey, type Winner } from '../../supabase/functions/notify-contest-winner/policy'
import { nativeEmailPayload } from '../../supabase/functions/_shared/native-push-policy'

const winner: Winner = { week_start: '2026-10-12', user_id: 'winner', capture_id: 'capture', votes: 12, email_notified_at: null, push_notified_at: null }
describe('winner email and push', () => {
  it('sends one email and one push for a victory, never twice after completion', async () => {
    const counts = { email: 0, push: 0 }
    const saved = { ...winner }
    const handlers = {
      claim: async () => true,
      email: async () => { counts.email++; return true },
      push: async () => { counts.push++; return true },
      complete: async (channel: 'email' | 'push') => { saved[`${channel}_notified_at`] = 'done' },
    }
    await notifyWinner(saved, handlers)
    await notifyWinner(saved, handlers)
    expect(counts).toEqual({ email: 1, push: 1 })
  })
  it('still sends push when email fails, then retries only email', async () => {
    const saved = { ...winner }
    const counts = { email: 0, push: 0 }
    const handlers = {
      claim: async () => true,
      email: async () => { counts.email++; return counts.email > 1 },
      push: async () => { counts.push++; return true },
      complete: async (channel: 'email' | 'push') => { saved[`${channel}_notified_at`] = 'done' },
    }
    await notifyWinner(saved, handlers)
    await notifyWinner(saved, handlers)
    expect(counts).toEqual({ email: 2, push: 1 })
  })
  it('does not send while another execution owns the same victory claim', async () => {
    let sends = 0
    await notifyWinner(winner, { claim: async () => false, email: async () => { sends++; return true }, push: async () => { sends++; return true }, complete: async () => {} })
    expect(sends).toBe(0)
  })
  it('separates victories and channels with stable event keys', () => {
    expect(winnerEventKey(winner, 'email')).toBe('contest-winner-2026-10-12-winner-email')
    expect(winnerEventKey(winner, 'push')).not.toBe(winnerEventKey(winner, 'email'))
    expect(winnerEventKey({ ...winner, week_start: '2026-10-19' }, 'email')).not.toBe(winnerEventKey(winner, 'email'))
  })
  it('routes the winning push to the specific original capture', () => {
    expect(nativeEmailPayload('contest-winner', { captureUrl: 'https://faunex.fr/home?capture=abc' }, 'fr', 'win')?.url).toBe('/home?capture=abc')
  })
})