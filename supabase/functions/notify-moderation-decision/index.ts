import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const APP_URL = 'https://faunex.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    // Appel interne (auto-modération) : reconnu par le secret cron ou la clé service.
    const cronSecret = Deno.env.get('CRON_SECRET')
    const isInternal = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret

    if (!isInternal) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
      const token = authHeader.replace('Bearer ', '')

      if (token !== serviceKey) {
        const anonClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        )
        const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
        if (claimsError || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
        const callerId = claimsData.claims.sub as string

        // Only admins may trigger moderation notifications.
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: callerId,
          _role: 'admin',
        })
        if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      }
    }



    const body = await req.json()
    const userId: string | undefined = body?.user_id
    const decision: string | undefined = body?.decision
    const animalName: string = (body?.animal_name || 'Ta capture').toString().slice(0, 120)
    const captureId: string | undefined = body?.capture_id
    // 'duplicate' : rejet parce que l'espèce est déjà dans le bestiaire de l'explorateur.
    const reason: string = body?.reason === 'duplicate' ? 'duplicate' : 'not_identifiable'

    if (!userId || !decision || !['approved', 'rejected'].includes(decision)) {
      return json({ error: 'Missing or invalid params' }, 400)
    }

    // Anti-doublon : une même décision (auto-modération + relance manuelle, ou
    // deux exécutions concurrentes) ne doit produire qu'un seul e-mail et une
    // seule notification push. Verrou atomique valable 24 h.
    const dedupeKey = `moderation-${decision}-${reason}-${captureId ?? `${userId}-${animalName}`}`
    const { data: claimed, error: claimErr } = await supabase.rpc('try_claim_notification', {
      p_key: dedupeKey,
      p_ttl_seconds: 86400,
    })
    if (claimErr) console.error('try_claim_notification failed', claimErr.message)
    if (claimed === false) {
      return json({ success: true, skipped: 'duplicate_notification' })
    }

    const [{ data: profile }, { data: userAuth }] = await Promise.all([
      supabase.from('profiles').select('display_name, username').eq('user_id', userId).single(),
      supabase.auth.admin.getUserById(userId),
    ])


    const recipientName = profile?.display_name || profile?.username || 'Explorateur'
    const email = userAuth?.user?.email

    const approved = decision === 'approved'

    let emailResult: unknown = 'skipped'
    if (email) {
      emailResult = await sendAppEmail(
        supabase,
        approved ? 'capture-approved' : 'capture-rejected',
        email,
        {
          templateData: {
            recipientName,
            animalName,
            reason,
            captureUrl: approved
              ? `${APP_URL}/collection${captureId ? `?capture=${captureId}` : ''}`
              : `${APP_URL}/capture`,
          },
          idempotencyKey: dedupeKey,
          messageId: dedupeKey,

        },
      )
    }

    const pushResult = await sendPushToUser(supabase, userId, {
      title: approved
        ? 'Capture validée 🎉'
        : reason === 'duplicate' ? 'Espèce déjà collectionnée' : 'Capture non validée',
      body: approved
        ? `${animalName} rejoint ton bestiaire !`
        : reason === 'duplicate'
          ? `${animalName} est déjà dans ton bestiaire. Pars à la rencontre d'une nouvelle espèce !`
          : `${animalName} n'a pas pu être identifiée. Retente avec une photo plus nette.`,
      url: approved ? `/collection${captureId ? `?capture=${captureId}` : ''}` : '/capture',
      tag: `moderation-${captureId ?? userId}`,
    })

    return json({ success: true, email: emailResult, push: pushResult })
  } catch (e) {
    console.error('notify-moderation-decision error', e)
    return json({ error: 'internal' }, 500)
  }
})

async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: { title: string; body: string; url: string; tag: string },
) {
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
