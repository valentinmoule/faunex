import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'
import webpush from 'npm:web-push@3.6.7'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { sendNativePush } from '../_shared/native-push.ts'
import { nativeEmailPayload } from '../_shared/native-push-policy.ts'
import { notifyWinner, type Winner } from './policy.ts'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronSecret = Deno.env.get('CRON_SECRET')
  const url = Deno.env.get('SUPABASE_URL')
  if (!serviceKey || !url) return json({ error: 'unavailable' }, 503)
  // Only stored winner events may trigger delivery. No browser-triggered sends.
  if (!(cronSecret && req.headers.get('x-cron-secret') === cronSecret) &&
      req.headers.get('Authorization') !== `Bearer ${serviceKey}`) return json({ error: 'Unauthorized' }, 401)
  try {
    const parsed = z.object({ week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict().safeParse(await req.json())
    if (!parsed.success) return json({ error: 'invalid_week' }, 400)
    const db = createClient(url, serviceKey)
    const { data: winner, error } = await db.from('photo_contest_winners')
      .select('week_start,user_id,capture_id,votes,email_notified_at,push_notified_at')
      .eq('week_start', parsed.data.week_start).maybeSingle()
    if (error) throw error
    if (!winner || winner.votes < 1) return json({ error: 'winner_not_found' }, 404)
    const [{ data: profile, error: profileError }, { data: capture, error: captureError }, { data: auth, error: authError }] = await Promise.all([
      db.from('profiles').select('display_name,username,locale').eq('user_id', winner.user_id).maybeSingle(),
      db.from('captures').select('animal_name').eq('id', winner.capture_id).maybeSingle(),
      db.auth.admin.getUserById(winner.user_id),
    ])
    if (profileError || captureError || authError || !profile || !auth.user) return json({ error: 'recipient_unavailable' }, 503)
    const captureUrl = winner.capture_id ? `https://faunex.fr/home?capture=${winner.capture_id}` : 'https://faunex.fr/explorers'
    const templateData = { recipientName: profile.display_name || profile.username || 'Explorateur', animalName: capture?.animal_name || '', captureUrl, locale: profile.locale }
    const results = await notifyWinner(winner as Winner, {
      claim: async key => {
        const { data, error } = await db.rpc('try_claim_notification', { p_key: key, p_ttl_seconds: 600 })
        if (error) throw error
        return data === true
      },
      email: async key => {
        // Contest results are expected account events, not marketing. Lovable
        // applies the recipient's app-email unsubscribe preference itself.
        if (!auth.user.email || !auth.user.email_confirmed_at) return true
        await sendTemplateEmail('contest-winner', auth.user.email, { templateData, idempotencyKey: key })
        return true // A suppressed address is terminal, never retried around.
      },
      push: async key => {
        const payload = nativeEmailPayload('contest-winner', templateData, profile.locale || 'fr', key)
        if (!payload) return false
        const native = await sendNativePush(db, winner.user_id, payload, 'contest-winner')
        const web = await sendWebPush(db, winner.user_id, payload)
        return !('failure' in native && native.failure > 0) && web.failure === 0
      },
      complete: async channel => {
        const { error } = await db.from('photo_contest_winners')
          .update({ [`${channel}_notified_at`]: new Date().toISOString() }).eq('week_start', winner.week_start)
        if (error) throw error
      },
    })
    console.log('Contest winner notification', { week_start: winner.week_start, results })
    return json({ success: !Object.values(results).includes('failed'), results }, Object.values(results).includes('failed') ? 503 : 200)
  } catch (error) {
    console.error('Contest winner notification failed', error instanceof Error ? error.message : 'unknown')
    return json({ error: 'notification_failed' }, 500)
  }
})

async function sendWebPush(db: any, userId: string, payload: { title: string; body: string; url: string; tag: string }) {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return { failure: 0 }
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@faunex.fr', publicKey, privateKey)
  const { data: subscriptions, error } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId)
  if (error) throw error
  let failure = 0
  for (const sub of subscriptions || []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload))
    } catch (error: any) {
      if ([404, 410].includes(error?.statusCode)) await db.from('push_subscriptions').delete().eq('id', sub.id)
      else { failure++; console.error('Winner web push failed', { status: error?.statusCode }) }
    }
  }
  return { failure }
}