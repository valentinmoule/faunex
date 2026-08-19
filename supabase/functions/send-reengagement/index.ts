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

    // Find users who signed up exactly 2 days ago (within a 1-hour window to avoid duplicates)
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const windowStart = new Date(twoDaysAgo.getTime() - 30 * 60 * 1000) // -30min
    const windowEnd = new Date(twoDaysAgo.getTime() + 30 * 60 * 1000)   // +30min

    // Get profiles created ~2 days ago that have marketing emails enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, marketing_emails')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', windowEnd.toISOString())
      .eq('marketing_emails', true)

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No users to re-engage' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get their emails from auth.users via admin API
    let sentCount = 0

    for (const profile of profiles) {
      // Check if user has any captures — skip if they're already active
      const { count } = await supabase
        .from('captures')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.user_id)

      if (count && count > 0) continue // Already active, skip


      const displayName = profile.display_name || profile.username || 'Explorateur'
      const siteUrl = 'https://faunex.lovable.app'


      const outcome = await sendAppEmail(supabase, 'reengagement-j2', email, {
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
    console.error('Reengagement error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
