import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'
import { ReengagementEmail } from '../_shared/email-templates/reengagement.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Find users who signed up exactly 2 days ago (within a 1-hour window to avoid duplicates)
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const windowStart = new Date(twoDaysAgo.getTime() - 30 * 60 * 1000) // -30min
    const windowEnd = new Date(twoDaysAgo.getTime() + 30 * 60 * 1000)   // +30min

    // Get profiles created ~2 days ago
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, username')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', windowEnd.toISOString())

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

      // Check suppression list
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
      if (!authUser?.user?.email) continue

      const email = authUser.user.email

      // Check if already sent (idempotency via message_id)
      const messageId = `reengagement-j2-${profile.user_id}`
      const { data: existingLog } = await supabase
        .from('email_send_log')
        .select('id')
        .eq('message_id', messageId)
        .limit(1)

      if (existingLog && existingLog.length > 0) continue // Already sent

      // Check suppressed
      const { data: suppressed } = await supabase
        .from('suppressed_emails')
        .select('id')
        .eq('email', email)
        .limit(1)

      if (suppressed && suppressed.length > 0) continue

      const displayName = profile.display_name || profile.username || 'Explorateur'
      const siteUrl = 'https://faunex.lovable.app'

      // Render the email
      const html = await render(
        React.createElement(ReengagementEmail, { displayName, siteUrl })
      )

      // Enqueue via the transactional email queue
      const { error: enqueueError } = await supabase.rpc('enqueue_email', {
        p_queue_name: 'transactional_emails',
        p_message_id: messageId,
        p_to: email,
        p_subject: `${displayName}, la nature t'attend ! 🌿`,
        p_html: html,
        p_from: 'Faunex <noreply@notify.faunex.fr>',
        p_template_name: 'reengagement-j2',
      })

      if (enqueueError) {
        console.error(`Failed to enqueue for ${profile.user_id}:`, enqueueError)
        continue
      }

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
