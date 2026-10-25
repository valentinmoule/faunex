import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { sendNativePush } from '../_shared/native-push.ts'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const APP_URL = 'https://faunex.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Enforce auth: caller must be signed in AND must be the actor.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceKey) return json({ error: 'service_unavailable' }, 503)
    const anonClient = createClient(
      url,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const callerId = claimsData.claims.sub

    const supabase = createClient(url, serviceKey)
    const parsed = z.object({ capture_id: z.string().uuid(), actor_id: z.string().uuid(), type: z.enum(['like', 'comment']), comment_id: z.string().uuid().optional() }).safeParse(await req.json().catch(() => null))
    if (!parsed.success) return json({ error: 'Missing or invalid params' }, 400)
    const { capture_id, actor_id, type, comment_id } = parsed.data
    if (actor_id !== callerId) {
      return json({ error: 'Forbidden: actor must be the authenticated caller' }, 403)
    }

    const { data: visibleCapture } = await anonClient.from('captures').select('id').eq('id', capture_id).maybeSingle()
    if (!visibleCapture) return json({ error: 'capture_not_found' }, 404)
    let commentQuery = supabase.from('feed_comments').select('id, content').eq('capture_id', capture_id).eq('user_id', callerId)
    if (comment_id) commentQuery = commentQuery.eq('id', comment_id)
    const { data: interaction, error: interactionError } = type === 'like'
      ? await supabase.from('feed_likes').select('id').eq('capture_id', capture_id).eq('user_id', callerId).maybeSingle()
      : await commentQuery.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (interactionError || !interaction) return json({ error: 'interaction_not_found' }, 403)
    const content = 'content' in interaction ? String(interaction.content) : ''
    const notificationKey = `interaction-${type}-${interaction.id}`

    const { data: capture } = await supabase
      .from('captures')
      .select('user_id, animal_name')
      .eq('id', capture_id)
      .single()
    if (!capture) return json({ error: 'capture_not_found' }, 404)

    const { data: actorProfile } = await supabase.from('profiles').select('display_name, username').eq('user_id', actor_id).single()
    const actorName = actorProfile?.display_name || actorProfile?.username || 'Un explorateur'
    const recipients = new Map<string, boolean>()
    if (capture.user_id !== actor_id) recipients.set(capture.user_id, false)
    if (type === 'comment') {
      const { data: mentions, error } = await supabase.rpc('comment_mention_recipients', { p_capture_id: capture_id, p_actor_id: actor_id, p_content: content })
      if (error) return json({ error: 'mentions_unavailable' }, 503)
      for (const mention of mentions ?? []) recipients.set(mention.user_id, true)
    }
    const results = []
    for (const [recipientId, mention] of recipients) {
      const key = `${notificationKey}-${recipientId}`
      const { data: claimed, error: claimError } = await supabase.rpc('try_claim_notification', { p_key: key, p_ttl_seconds: 86400 })
      if (claimError) return json({ error: 'notification_unavailable' }, 503)
      if (!claimed) continue
      const [{ data: profile }, { data: auth }] = await Promise.all([
        supabase.from('profiles').select('display_name, username, locale, marketing_emails, notify_email_likes, notify_email_comments, notify_push_likes, notify_push_comments').eq('user_id', recipientId).single(),
        supabase.auth.admin.getUserById(recipientId),
      ])
      if (!profile) continue
      const en = profile.locale === 'en'
      const emailAllowed = profile.marketing_emails && (type === 'like' ? profile.notify_email_likes : profile.notify_email_comments)
      const pushAllowed = type === 'like' ? profile.notify_push_likes : profile.notify_push_comments
      let email: unknown = 'skipped'
      if (emailAllowed && auth?.user?.email) {
        const templateName = type === 'like' ? 'capture-like' : 'capture-comment'
        email = await sendAppEmail(supabase, templateName, auth.user.email, {
          templateData: { actorName, recipientName: profile.display_name || profile.username || 'Explorateur', animalName: capture.animal_name, commentText: type === 'comment' ? content.slice(0, 500) : undefined, mention, locale: profile.locale, captureUrl: `${APP_URL}/home?capture=${capture_id}` },
          idempotencyKey: `${templateName}-${key}`,
        })
      }
      let push: unknown = 'skipped'
      if (pushAllowed) push = await sendPushToUser(supabase, recipientId, {
        title: mention
          ? (en ? `${actorName} mentioned you 💬` : `${actorName} t’a mentionné 💬`)
          : type === 'like'
            ? (en ? `${actorName} liked your capture ❤️` : `${actorName} a liké ta capture ❤️`)
            : (en ? `${actorName} commented on your capture 💬` : `${actorName} a commenté ta capture 💬`),
        body: type === 'like' ? capture.animal_name : content.slice(0, 140),
        url: `/home?capture=${capture_id}`,
        tag: `${type}-${interaction.id}-${recipientId}`,
      })
      results.push({ email, push })
    }
    return json({ success: true, results })
  } catch (e) {
    console.error('notify-capture-interaction error', e)
    return json({ error: 'internal' }, 500)
  }
})

async function sendPushToUser(supabase: any, userId: string, payload: { title: string; body: string; url: string; tag: string }) {
  await sendNativePush(supabase, userId, payload, payload.tag.startsWith('like-') ? 'capture-like' : 'capture-comment').catch(() => console.error('Native interaction push failed'))
  const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@faunex.fr'
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return 'no_vapid'

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return 'no_subs'

  let success = 0
  let failure = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      success++
    } catch (e: any) {
      failure++
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('push send error', e?.statusCode, e?.body)
      }
    }
  }
  return { success, failure }
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
