import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const APP_URL = 'https://faunex.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Enforce auth: caller must be signed in AND must be the actor.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const callerId = claimsData.claims.sub

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { capture_id, actor_id, type, content } = await req.json()

    if (!capture_id || !actor_id || !type || !['like', 'comment'].includes(type)) {
      return json({ error: 'Missing or invalid params' }, 400)
    }
    if (actor_id !== callerId) {
      return json({ error: 'Forbidden: actor must be the authenticated caller' }, 403)
    }

    const { data: capture } = await supabase
      .from('captures')
      .select('user_id, animal_name')
      .eq('id', capture_id)
      .single()
    if (!capture) return json({ error: 'capture_not_found' }, 404)

    if (capture.user_id === actor_id) return json({ skipped: 'self_action' })

    const [{ data: actorProfile }, { data: ownerProfile }, { data: ownerAuth }] = await Promise.all([
      supabase.from('profiles').select('display_name, username').eq('user_id', actor_id).single(),
      supabase
        .from('profiles')
        .select('display_name, username, marketing_emails, notify_email_likes, notify_email_comments, notify_push_likes, notify_push_comments')
        .eq('user_id', capture.user_id)
        .single(),
      supabase.auth.admin.getUserById(capture.user_id),
    ])

    if (!ownerProfile || !ownerAuth?.user?.email) return json({ error: 'owner_not_found' }, 404)

    const actorName = actorProfile?.display_name || actorProfile?.username || 'Un explorateur'
    const recipientName = ownerProfile.display_name || ownerProfile.username || 'Explorateur'

    const emailAllowed = ownerProfile.marketing_emails && (
      type === 'like' ? ownerProfile.notify_email_likes : ownerProfile.notify_email_comments
    )
    const pushAllowed = type === 'like' ? ownerProfile.notify_push_likes : ownerProfile.notify_push_comments

    let emailResult: unknown = 'skipped'
    if (emailAllowed) {
      const templateName = type === 'like' ? 'capture-like' : 'capture-comment'
      const idempotencyBase = type === 'like'
        ? `like-${capture_id}-${actor_id}`
        : `comment-${capture_id}-${actor_id}-${Date.now()}`

      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName,
          recipientEmail: ownerAuth.user.email,
          idempotencyKey: idempotencyBase,
          templateData: {
            actorName,
            recipientName,
            animalName: capture.animal_name,
            commentText: type === 'comment' ? (content || '').slice(0, 500) : undefined,
            captureUrl: `${APP_URL}/explorers`,
          },
        },
      })
      if (error) console.error('send-transactional-email failed', error)
      emailResult = error ? 'failed' : 'sent'
    }

    let pushResult: unknown = 'skipped'
    if (pushAllowed) {
      pushResult = await sendPushToUser(supabase, capture.user_id, {
        title: type === 'like' ? `${actorName} a liké ta capture ❤️` : `${actorName} a commenté ta capture 💬`,
        body: type === 'like'
          ? `${capture.animal_name || 'Ta capture'} a reçu un nouveau like.`
          : (content || '').slice(0, 140) || 'Nouveau commentaire sur ta capture.',
        url: '/explorers',
        tag: `${type}-${capture_id}`,
      })
    }

    return json({ success: true, email: emailResult, push: pushResult })
  } catch (e) {
    console.error('notify-capture-interaction error', e)
    return json({ error: 'internal' }, 500)
  }
})

async function sendPushToUser(supabase: any, userId: string, payload: { title: string; body: string; url: string; tag: string }) {
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
