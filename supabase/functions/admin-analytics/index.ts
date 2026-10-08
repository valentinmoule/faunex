import { createClient } from 'npm:@supabase/supabase-js@2'

// Comptes de test exclus des statistiques (+all, +test, revue App Store)
const TEST_USER_IDS = [
  'c62717cb-255a-4491-a5a0-132880e703be',
  'ac0df155-7422-4073-bfc1-14e2a71960bc',
  'f7910e92-39a6-4703-b31d-bf1e245e2a4e',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const callerClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: roleRow } = await admin.from('user_roles').select('role')
      .eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!roleRow) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const isAll = body.all === true || body.days === 'all'
    const days = isAll ? 0 : Math.max(1, Math.min(3650, Number(body.days) || 30))
    const startISO = isAll
      ? new Date(0).toISOString()
      : body.start ? new Date(body.start).toISOString()
      : new Date(Date.now() - days * 86400000).toISOString()
    // Une date de fin "AAAA-MM-JJ" inclut toute la journée
    const endISO = body.end
      ? new Date(new Date(body.end).getTime() + 86400000 - 1).toISOString()
      : new Date().toISOString()

    // Agrégation en base : évite la limite de 1000 lignes par requête
    const { data: s, error } = await admin.rpc('admin_analytics', {
      _start: startISO, _end: endISO, _excluded: TEST_USER_IDS,
    })
    if (error) throw error
    const r = (s as any).retention || {}
    const rate = (k: string) => (r[k]?.n ? r[k].k / r[k].n : 0)
    const totalUsers = s.totalUsers || 0
    return json({
      range: { startISO, endISO, days },
      kpis: {
        dau: s.dau, wau: s.wau, mau: s.mau,
        totalUsers, totalCaptures: s.totalCaptures,
        avgCapturesPerUser: totalUsers ? s.totalCaptures / totalUsers : 0,
        usersWithCapture: s.usersWithCapture,
        usersWithCaptureRate: totalUsers ? s.usersWithCapture / totalUsers : 0,
        activeInPeriod: s.activeInPeriod,
        newUsersInPeriod: s.newUsersInPeriod,
        capturesInPeriod: s.capturesInPeriod,
        capturersInPeriod: s.capturersInPeriod,
        loginsInPeriod: s.loginsInPeriod,
        avgLoginsPerUser: s.activeInPeriod ? s.loginsInPeriod / s.activeInPeriod : 0,
        avgTimeBetweenCapturesHours: Number(s.avgGapHours) || 0,
      },
      series: { newUsersByWeek: s.newUsersByWeek, loginsByWeek: s.loginsByWeek, capturesByDay: s.capturesByDay },
      topUsers: s.topUsers,
      retention: {
        j1: rate('j1'), j7: rate('j7'), j30: rate('j30'),
        cohortSizes: { j1: r.j1?.n || 0, j7: r.j7?.n || 0, j30: r.j30?.n || 0 },
      },
      newVsReturning: { new: s.newInPeriodActive, returning: s.activeInPeriod - s.newInPeriodActive },
      cancelReasons: s.cancelReasons,
      cancelComments: s.cancelComments,
    })
  } catch (e) {
    console.error('admin-analytics error', e)
    return json({ error: (e as Error).message }, 500)
  }
})

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
