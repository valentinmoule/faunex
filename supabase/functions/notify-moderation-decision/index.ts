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
    const decision: string | undefined = body?.decision
    const captureId: string | undefined = body?.capture_id
    if (!captureId || !decision || !['approved', 'rejected'].includes(decision)) {
      return json({ error: 'Missing or invalid params' }, 400)
    }
    const { data: capture, error: captureError } = await supabase.from('captures')
      .select('id, user_id, animal_name, scientific_name, status').eq('id', captureId).maybeSingle()
    if (captureError || !capture) return json({ error: 'capture_not_found' }, 404)
    if ((decision === 'approved' && capture.status !== 'approved') ||
        (decision === 'rejected' && !['pending_review', 'processing'].includes(capture.status))) {
      return json({ error: 'invalid_moderation_state' }, 409)
    }
    const userId = capture.user_id
    const animalName = capture.animal_name
    const ALLOWED_REASONS = ['not_identifiable', 'duplicate', 'dead_animal', 'internet_image', 'captured_animal']
    let reason = ALLOWED_REASONS.includes(body?.reason) ? body.reason : 'not_identifiable'
    let duplicateName: string | null = null
    let duplicateScientific: string | null = null
    if (decision === 'rejected') {
      // Doublon détecté automatiquement, quelle que soit la raison invoquée :
      // si l'explorateur possède déjà cette espèce, on le lui dit plutôt que
      // « l'animal n'a pas pu être vérifié ».
      const { data: identities } = await supabase.rpc('resolve_species_identity', {
        p_name: capture.animal_name, p_scientific: capture.scientific_name ?? '',
      })
      const identity = identities?.[0]
      const { data: duplicate } = await supabase.from('captures')
        .select('animal_name, scientific_name').eq('user_id', userId).eq('status', 'approved')
        .neq('id', captureId).ilike('animal_name', identity?.matched ? identity.name : animalName)
        .limit(1).maybeSingle()
      if (duplicate) {
        reason = 'duplicate'
        duplicateName = duplicate.animal_name
        duplicateScientific = duplicate.scientific_name
        // La notification in-app (insérée par l'appelant avant cet appel) porte
        // le nom de l'espèce en comment_text : on le remplace par un marqueur
        // « duplicate:… » pour que l'app affiche le message « déjà capturée ».
        await supabase.from('notifications')
          .update({ comment_text: `duplicate:${duplicate.animal_name}` })
          .eq('user_id', userId).eq('type', 'capture_rejected')
          .eq('comment_text', animalName)
      } else if (reason !== 'not_identifiable') {
        // Marqueur « motif:… » pour que l'app affiche le message adapté.
        await supabase.from('notifications')
          .update({ comment_text: `${reason}:${animalName}` })
          .eq('user_id', userId).eq('type', 'capture_rejected')
          .eq('comment_text', animalName)
      }
    }

    // Anti-doublon : une même décision (auto-modération + relance manuelle, ou
    // deux exécutions concurrentes) ne doit produire qu'un seul e-mail et une
    // seule notification push. Verrou atomique valable 24 h.
    const dedupeKey = `moderation-${decision}-${reason}-${captureId ?? `${userId}-${animalName}`}`
    const { data: claimed, error: claimErr } = await supabase.rpc('try_claim_notification', {
      p_key: dedupeKey,
      p_ttl_seconds: 86400,
    })
    if (claimErr) return json({ error: 'notification_unavailable' }, 503)
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
            duplicateName,
            duplicateScientific,
            captureUrl: approved
              ? `${APP_URL}/home${captureId ? `?capture=${captureId}` : ''}`
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
          ? `${animalName} correspond à ${duplicateName ? `« ${duplicateName} »` : 'une espèce'}${duplicateScientific ? ` (${duplicateScientific})` : ''}, déjà dans ton bestiaire. Pars à la rencontre d'une nouvelle espèce !`
          : reason === 'dead_animal'
            ? `Les animaux morts ou cadavres ne sont pas acceptés sur Faunex. Photographie des animaux vivants !`
            : reason === 'internet_image'
              ? `Les images provenant d'Internet ne sont pas acceptées. Partage uniquement tes propres photos !`
              : reason === 'captured_animal'
                ? `Les animaux capturés ou pêchés par l'humain ne sont pas acceptés, même relâchés ensuite. Photographie-les en liberté !`
                : `${animalName} n'a pas pu être identifiée. Retente avec une photo plus nette.`,
      url: approved ? `/home${captureId ? `?capture=${captureId}` : ''}` : '/capture',
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
