import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'
import { InactivityEmail } from '../_shared/email-templates/inactivity-email.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

async function requireAdmin(req: Request, adminClient: any): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedCronSecret = Deno.env.get('CRON_SECRET');
  // Appels planifiés (pg_cron) : la tâche présente le secret CRON_SECRET.
  if (expectedCronSecret && cronSecret === expectedCronSecret) {
    return null;
  }
  // Rétrocompatibilité : appels directement authentifiés avec la service role key.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
    return null;
  }
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: claimsData, error } = await anon.auth.getClaims(authHeader.replace('Bearer ', ''));
  const callerId = claimsData?.claims?.sub;
  if (error || !callerId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { data: roleRow } = await adminClient.from('user_roles').select('role').eq('user_id', callerId).eq('role', 'admin').maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const forbidden = await requireAdmin(req, supabase)
    if (forbidden) return forbidden

    const INACTIVE_DAYS = 14
    const COOLDOWN_DAYS = 30
    const now = new Date()
    const inactiveBefore = new Date(now.getTime() - INACTIVE_DAYS * 86400000).toISOString()
    const cooldownAfter = new Date(now.getTime() - COOLDOWN_DAYS * 86400000).toISOString()

    // 1. Find inactive users via profiles.last_login_at (maintenu à jour par le trigger)
    const { data: inactiveProfiles, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, last_login_at')
      .lt('last_login_at', inactiveBefore)
      .not('last_login_at', 'is', null)

    if (profErr) throw profErr

    if (!inactiveProfiles || inactiveProfiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No inactive users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const candidateIds = inactiveProfiles.map(p => p.user_id)

    // 2. Exclude users who already received an inactivity email in the cooldown window
    const messageIdPrefix = `inactivity-email-`
    const { data: recentLogs } = await supabase
      .from('email_send_log')
      .select('message_id')
      .ilike('message_id', `${messageIdPrefix}%`)
      .gte('created_at', cooldownAfter)

    const recentlyNotified = new Set((recentLogs ?? []).map(r => {
      const parts = r.message_id.split('-')
      return parts[parts.length - 1]
    }))
    const toNotify = candidateIds.filter(id => !recentlyNotified.has(id))

    if (toNotify.length === 0) {
      return new Response(JSON.stringify({ sent: 0, candidates: candidateIds.length, reason: 'recently notified' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Fetch profiles with marketing consent
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, marketing_emails')
      .in('user_id', toNotify)
      .eq('marketing_emails', true)

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, candidates: toNotify.length, reason: 'no marketing consent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sentCount = 0
    const siteUrl = 'https://faunex.fr'

    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
      const email = authUser?.user?.email
      if (!email) continue

      // Check suppression list
      const { data: suppressed } = await supabase
        .from('suppressed_emails')
        .select('id')
        .eq('email', email)
        .limit(1)

      if (suppressed && suppressed.length > 0) continue

      const displayName = profile.display_name || profile.username || 'Explorateur'
      const messageId = `inactivity-email-${profile.user_id}`

      const html = await render(
        React.createElement(InactivityEmail, { displayName, siteUrl })
      )

      const { error: enqueueError } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId,
          to: email,
          from: 'Faunex <noreply@notify.faunex.fr>',
          sender_domain: 'notify.faunex.fr',
          subject: `${displayName}, la nature t'attend 🌿`,
          html,
          label: 'inactivity-email',
          purpose: 'transactional',
          idempotency_key: messageId,
          queued_at: new Date().toISOString(),
        },
      })

      if (enqueueError) {
        console.error(`Failed to enqueue for ${profile.user_id}:`, enqueueError)
        continue
      }

      sentCount++
    }

    return new Response(JSON.stringify({ sent: sentCount, candidates: profiles.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Inactivity email error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
