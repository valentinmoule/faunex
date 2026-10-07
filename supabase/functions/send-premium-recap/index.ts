import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'

/**
 * Récap envoyé le jour où le Premium d'un utilisateur prend fin (abonnement
 * résilié arrivé à échéance, abonnements réels uniquement) : rappelle ce que
 * Premium a apporté sur la période. Un seul envoi par période.
 */
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const expected = Deno.env.get('CRON_SECRET')
  if (!expected || req.headers.get('x-cron-secret') !== expected) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now = Date.now()
  const from = new Date(now - 86400000).toISOString()
  const to = new Date(now).toISOString()

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('user_id, paddle_subscription_id, price_id, current_period_start, current_period_end')
    .eq('environment', 'live')
    .or('cancel_at_period_end.eq.true,status.eq.canceled')
    .gte('current_period_end', from)
    .lt('current_period_end', to)
  if (error) return json({ error: error.message }, 500)

  let sent = 0
  for (const s of subs ?? []) {
    const messageId = `premium-end-recap-${s.paddle_subscription_id}-${String(s.current_period_end).slice(0, 10)}`
    const { data: already } = await supabase.from('email_send_log').select('id').eq('message_id', messageId).limit(1)
    if (already?.length) continue

    const [{ data: authUser }, { data: profile }, { data: caps }] = await Promise.all([
      supabase.auth.admin.getUserById(s.user_id),
      supabase.from('profiles').select('display_name, username, locale').eq('user_id', s.user_id).maybeSingle(),
      supabase.from('captures').select('animal_name').eq('user_id', s.user_id).eq('status', 'approved')
        .gte('created_at', s.current_period_start ?? new Date(now - 31 * 86400000).toISOString()),
    ])
    const email = authUser?.user?.email
    if (!email) continue
    const locale = profile?.locale === 'en' ? 'en' : 'fr'
    const renewalDate = new Date(s.current_period_end).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
    })
    const species = new Set((caps ?? []).map((c: any) => String(c.animal_name).toLowerCase())).size

    const outcome = await sendAppEmail(supabase, 'premium-recap', email, {
      templateData: {
        displayName: profile?.display_name || profile?.username || (locale === 'en' ? 'Explorer' : 'Explorateur'),
        siteUrl: 'https://faunex.fr',
        captures: caps?.length ?? 0,
        species,
        renewalDate,
        locale,
      },
      idempotencyKey: messageId,
      messageId,
    })
    if (outcome === 'sent') sent++
  }
  return json({ sent, candidates: subs?.length ?? 0 })
})
