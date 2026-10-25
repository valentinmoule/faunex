import { createClient } from 'npm:@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anon || !service) return json({ error: 'not_configured' }, 503)
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) return json({ error: 'unauthorized' }, 401)
    const body = await req.json()
    if (typeof body.token !== 'string' || body.token.length < 20 || body.token.length > 4096 || !['ios', 'android'].includes(body.platform) || !['register', 'remove'].includes(body.action)) return json({ error: 'invalid_device' }, 400)
    const admin = createClient(url, service)
    const result = body.action === 'remove'
      ? await admin.from('native_push_devices').delete().eq('user_id', data.user.id).eq('token', body.token)
      : await admin.from('native_push_devices').upsert({ user_id: data.user.id, token: body.token, platform: body.platform, updated_at: new Date().toISOString() }, { onConflict: 'token' })
    if (result.error) return json({ error: 'registration_failed' }, 503)
    return json({ success: true })
  } catch { return json({ error: 'registration_failed' }, 500) }
})