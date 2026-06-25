import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const APP_URL = 'https://faunex.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { requester_id, addressee_id } = await req.json()

    if (!requester_id || !addressee_id) {
      return json({ error: 'Missing requester_id or addressee_id' }, 400)
    }

    const [{ data: requesterProfile }, { data: addresseeProfile }, { data: addresseeAuth }] =
      await Promise.all([
        supabase.from('profiles').select('display_name, username').eq('user_id', requester_id).single(),
        supabase
          .from('profiles')
          .select('display_name, username, marketing_emails, notify_email_follows, notify_push_follows')
          .eq('user_id', addressee_id)
          .single(),
        supabase.auth.admin.getUserById(addressee_id),
      ])

    if (!requesterProfile || !addresseeProfile || !addresseeAuth?.user?.email) {
      console.error('Could not fetch profiles or email')
      return json({ error: 'User not found' }, 404)
    }

    const requesterName =
      requesterProfile.display_name || requesterProfile.username || 'Un explorateur'
    const recipientName =
      addresseeProfile.display_name || addresseeProfile.username || 'Explorateur'
    const recipientEmail = addresseeAuth.user.email

    let emailResult: unknown = 'skipped'
    if (addresseeProfile.marketing_emails && addresseeProfile.notify_email_follows) {
      const { data, error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'new-follower',
          recipientEmail,
          idempotencyKey: `new-follower-${requester_id}-${addressee_id}-${Date.now()}`,
          templateData: {
            followerName: requesterName,
            recipientName,
            profileUrl: `${APP_URL}/explorers`,
          },
        },
      })
      if (error) console.error('send-transactional-email invocation failed', error)
      emailResult = error ? 'failed' : data
    }

    let pushResult: unknown = 'skipped'
    if (addresseeProfile.notify_push_follows) {
      pushResult = await sendPushToUser(supabase, addressee_id, {
        title: `${requesterName} veut te suivre 👀`,
        body: 'Ouvre Faunex pour accepter ou refuser la demande.',
        url: '/explorers',
        tag: `follow-${requester_id}-${addressee_id}`,
      })
    }

    return json({ success: true, email: emailResult, push: pushResult })
  } catch (error) {
    console.error('Error in notify-friend-request:', error)
    return json({ error: 'Internal error' }, 500)
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
