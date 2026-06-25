import { createClient } from 'npm:@supabase/supabase-js@2'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { requester_id, addressee_id } = await req.json()

    if (!requester_id || !addressee_id) {
      return new Response(JSON.stringify({ error: 'Missing requester_id or addressee_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const [{ data: requesterProfile }, { data: addresseeProfile }, { data: addresseeAuth }] =
      await Promise.all([
        supabase.from('profiles').select('display_name, username').eq('user_id', requester_id).single(),
        supabase
          .from('profiles')
          .select('display_name, username, marketing_emails')
          .eq('user_id', addressee_id)
          .single(),
        supabase.auth.admin.getUserById(addressee_id),
      ])

    if (!requesterProfile || !addresseeProfile || !addresseeAuth?.user?.email) {
      console.error('Could not fetch profiles or email')
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!addresseeProfile.marketing_emails) {
      console.log('User has opted out of non-essential emails', { addressee_id })
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const requesterName =
      requesterProfile.display_name || requesterProfile.username || 'Un explorateur'
    const recipientName =
      addresseeProfile.display_name || addresseeProfile.username || 'Explorateur'
    const recipientEmail = addresseeAuth.user.email

    // Send via the app emails (transactional) pipeline so it appears in App emails dashboard
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

    if (error) {
      console.error('send-transactional-email invocation failed', error)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Friend request app email queued', { to: recipientEmail, data })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in notify-friend-request:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
