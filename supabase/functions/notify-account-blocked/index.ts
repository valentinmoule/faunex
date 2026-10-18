import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Envoie l'email « compte bloqué » à un utilisateur.
 * Réservé aux administrateurs (ou aux appels internes service role).
 * Le destinataire et son blocage sont vérifiés auprès du service d'authentification.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const token = authHeader.replace('Bearer ', '')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    if (token !== serviceKey) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      )
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
      if (claimsError || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401)

      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: claimsData.claims.sub as string,
        _role: 'admin',
      })
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const userId: string | undefined = body?.user_id
    if (!userId) return json({ error: 'Missing user_id' }, 400)
    const { data: userAuth, error: userError } = await supabase.auth.admin.getUserById(userId)
    const user = userAuth?.user
    const bannedUntil = user && 'banned_until' in user ? user.banned_until : null
    if (userError || !user || typeof bannedUntil !== 'string' || Date.parse(bannedUntil) <= Date.now()) {
      return json({ error: 'Account is not blocked' }, 409)
    }
    const email = user.email

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Missing or invalid email / user_id' }, 400)
    }

    const result = await sendAppEmail(supabase, 'account-blocked', email, {
      idempotencyKey: `account-blocked-${userId ?? email}`,
    })

    return json({ success: true, email: result })
  } catch (e) {
    console.error('notify-account-blocked error', e)
    return json({ error: 'internal' }, 500)
  }
})

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
