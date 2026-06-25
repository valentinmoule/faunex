import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const APP_URL = 'https://faunex.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { capture_id, actor_id, type, content } = await req.json()

    if (!capture_id || !actor_id || !type || !['like', 'comment'].includes(type)) {
      return json({ error: 'Missing or invalid params' }, 400)
    }

    // Load capture (owner + animal name)
    const { data: capture } = await supabase
      .from('captures')
      .select('user_id, animal_name')
      .eq('id', capture_id)
      .single()
    if (!capture) return json({ error: 'capture_not_found' }, 404)

    // Don't notify if actor is the owner
    if (capture.user_id === actor_id) return json({ skipped: 'self_action' })

    const [{ data: actorProfile }, { data: ownerProfile }, { data: ownerAuth }] = await Promise.all([
      supabase.from('profiles').select('display_name, username').eq('user_id', actor_id).single(),
      supabase.from('profiles').select('display_name, username, marketing_emails').eq('user_id', capture.user_id).single(),
      supabase.auth.admin.getUserById(capture.user_id),
    ])

    if (!ownerProfile || !ownerAuth?.user?.email) return json({ error: 'owner_not_found' }, 404)

    if (!ownerProfile.marketing_emails) {
      return json({ skipped: 'opted_out' })
    }

    const actorName = actorProfile?.display_name || actorProfile?.username || 'Un explorateur'
    const recipientName = ownerProfile.display_name || ownerProfile.username || 'Explorateur'

    const templateName = type === 'like' ? 'capture-like' : 'capture-comment'
    const idempotencyBase = type === 'like'
      ? `like-${capture_id}-${actor_id}`
      : `comment-${capture_id}-${actor_id}-${Date.now()}`

    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName,
        recipientEmail: ownerAuth.user.email,
        idempotencyKey: idempotencyBase,
        templateData: {
          actorName,
          recipientName,
          animalName: capture.animal_name,
          commentText: type === 'comment' ? (content || '').slice(0, 500) : undefined,
          captureUrl: `${APP_URL}/explorers`,
        },
      },
    })

    if (error) {
      console.error('send-transactional-email failed', error)
      return json({ error: 'send_failed' }, 500)
    }

    return json({ success: true })
  } catch (e) {
    console.error('notify-capture-interaction error', e)
    return json({ error: 'internal' }, 500)
  }
})

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
