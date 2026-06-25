import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { FriendRequestEmail } from '../_shared/email-templates/friend-request.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'faunex'
const SENDER_DOMAIN = 'notify.faunex.fr'
const FROM_DOMAIN = 'notify.faunex.fr'
const APP_URL = 'https://faunex.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get requester_id and addressee_id from body
    const { requester_id, addressee_id } = await req.json()

    if (!requester_id || !addressee_id) {
      return new Response(JSON.stringify({ error: 'Missing requester_id or addressee_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch both profiles and the addressee's email
    const [{ data: requesterProfile }, { data: addresseeProfile }, { data: addresseeAuth }] = await Promise.all([
      supabase.from('profiles').select('display_name, username').eq('user_id', requester_id).single(),
      supabase.from('profiles').select('display_name, username, marketing_emails').eq('user_id', addressee_id).single(),
      supabase.auth.admin.getUserById(addressee_id),
    ])

    if (!requesterProfile || !addresseeProfile || !addresseeAuth?.user?.email) {
      console.error('Could not fetch profiles or email')
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Respect marketing_emails preference
    if (!addresseeProfile.marketing_emails) {
      console.log('User has opted out of non-essential emails', { addressee_id })
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const requesterName = requesterProfile.display_name || requesterProfile.username || 'Un explorateur'
    const recipientName = addresseeProfile.display_name || addresseeProfile.username || 'Explorateur'
    const recipientEmail = addresseeAuth.user.email

    const html = await renderAsync(
      React.createElement(FriendRequestEmail, {
        requesterName,
        recipientName,
        profileUrl: `${APP_URL}/explorers`,
      })
    )
    const text = await renderAsync(
      React.createElement(FriendRequestEmail, {
        requesterName,
        recipientName,
        profileUrl: `${APP_URL}/explorers`,
      }),
      { plainText: true }
    )

    const messageId = crypto.randomUUID()

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'friend_request',
      recipient_email: recipientEmail,
      status: 'pending',
    })

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipientEmail,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `${requesterName} veut être ton ami sur Faunex 🦊`,
        html,
        text,
        purpose: 'transactional',
        idempotency_key: `friend-request-${requester_id}-${addressee_id}-${messageId}`,
        label: 'friend_request',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue friend request email', enqueueError)
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'friend_request',
        recipient_email: recipientEmail,
        status: 'failed',
        error_message: 'Failed to enqueue',
      })
      return new Response(JSON.stringify({ error: 'Failed to enqueue' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Friend request email enqueued', { to: recipientEmail, messageId })

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
