import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'

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

    // Find users who signed up exactly 7 days ago (window: ±12h to be tolerant
    // to missed cron runs without ever sending twice — idempotency via message_id).
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const windowStart = new Date(sevenDaysAgo.getTime() - 12 * 60 * 60 * 1000)
    const windowEnd = new Date(sevenDaysAgo.getTime() + 12 * 60 * 60 * 1000)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, marketing_emails')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', windowEnd.toISOString())
      .eq('marketing_emails', true)

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No users to nudge' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sentCount = 0
    const siteUrl = 'https://faunex.fr'

    for (const profile of profiles) {
      // Skip users who already captured something
      const { count } = await supabase
        .from('captures')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.user_id)

      if (count && count > 0) continue

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
      const email = authUser?.user?.email
      if (!email) continue

      // Idempotency: one-shot per user
      const messageId = `no-capture-j7-${profile.user_id}`
      const { data: existingLog } = await supabase
        .from('email_send_log')
        .select('id')
        .eq('message_id', messageId)
        .limit(1)

      if (existingLog && existingLog.length > 0) continue


      const displayName = profile.display_name || profile.username || 'Explorateur'


      const outcome = await sendAppEmail(supabase, 'no-capture-j7', email, {
        templateData: { displayName, siteUrl },
        idempotencyKey: messageId,
        messageId,
      })

      if (outcome !== 'sent') continue

      sentCount++
    }

    return new Response(JSON.stringify({ sent: sentCount, total: profiles.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('no-capture-j7 error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
