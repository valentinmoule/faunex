import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Validate caller
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
    const callerId = userData.user.id

    const admin = createClient(url, serviceKey)
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle()
    if (!roleRow) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const days = Math.max(1, Math.min(365, Number(body.days) || 30))
    const startISO = body.start
      ? new Date(body.start).toISOString()
      : new Date(Date.now() - days * 86400000).toISOString()
    const endISO = body.end ? new Date(body.end).toISOString() : new Date().toISOString()
    const now = new Date()
    const day1 = new Date(now.getTime() - 86400000).toISOString()
    const day7 = new Date(now.getTime() - 7 * 86400000).toISOString()
    const day30 = new Date(now.getTime() - 30 * 86400000).toISOString()

    // === Snapshot KPIs (always full history) ===
    const [
      { count: totalUsers },
      { count: totalCaptures },
      { data: lastLogin1 },
      { data: lastLogin7 },
      { data: lastLogin30 },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('captures').select('*', { count: 'exact', head: true }),
      admin.from('login_events').select('user_id').gte('created_at', day1),
      admin.from('login_events').select('user_id').gte('created_at', day7),
      admin.from('login_events').select('user_id').gte('created_at', day30),
    ])

    const dau = new Set((lastLogin1 || []).map((r: any) => r.user_id)).size
    const wau = new Set((lastLogin7 || []).map((r: any) => r.user_id)).size
    const mau = new Set((lastLogin30 || []).map((r: any) => r.user_id)).size

    // === Period-scoped data ===
    const [
      { data: profilesPeriod },
      { data: capturesAll },
      { data: capturesPeriod },
      { data: loginsPeriod },
      { data: authUsers },
    ] = await Promise.all([
      admin.from('profiles').select('user_id, created_at, display_name, username').gte('created_at', startISO).lte('created_at', endISO),
      admin.from('captures').select('user_id, created_at'),
      admin.from('captures').select('user_id, created_at').gte('created_at', startISO).lte('created_at', endISO),
      admin.from('login_events').select('user_id, created_at').gte('created_at', startISO).lte('created_at', endISO),
      admin.from('profiles').select('user_id, created_at, display_name, username, total_captures'),
    ])

    // New users / week (period)
    const newUsersByWeek = bucketByWeek(profilesPeriod || [], 'created_at')

    // Logins per week + avg per user
    const loginsByWeek = bucketByWeek(loginsPeriod || [], 'created_at')
    const uniqueLoginUsers = new Set((loginsPeriod || []).map((r: any) => r.user_id)).size
    const avgLoginsPerUser = uniqueLoginUsers
      ? (loginsPeriod || []).length / uniqueLoginUsers
      : 0

    // Captures over time (period, daily)
    const capturesByDay = bucketByDay(capturesPeriod || [], 'created_at')

    // Captures globals
    const capturingUserIds = new Set((capturesAll || []).map((r: any) => r.user_id))
    const totalUsersN = totalUsers || 0
    const usersWithCapture = capturingUserIds.size
    const avgCapturesPerUser = totalUsersN ? (totalCaptures || 0) / totalUsersN : 0

    // Top 10 active users (period, by capture count)
    const captureCount: Record<string, number> = {}
    for (const c of capturesPeriod || []) {
      captureCount[(c as any).user_id] = (captureCount[(c as any).user_id] || 0) + 1
    }
    const topIds = Object.entries(captureCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    const userMap = new Map(
      (authUsers || []).map((u: any) => [u.user_id, u.display_name || u.username || '—'])
    )
    const topUsers = topIds.map(([uid, n]) => ({
      user_id: uid,
      name: userMap.get(uid) || '—',
      captures: n,
    }))

    // Retention J1/J7/J30: among users signed up >= N days ago in last 60d cohort,
    // did they log a capture or a login at >= N days after signup?
    const retention = computeRetention(authUsers || [], capturesAll || [], loginsPeriod || [])

    // Avg time between captures (per-user, then mean) – global
    const avgTimeBetweenCapturesHours = avgGapHours(capturesAll || [])

    // New vs returning (period): users who logged in in period,
    // split by signup date (within period = new, before = returning).
    const loginUsersInPeriod = new Set((loginsPeriod || []).map((r: any) => r.user_id))
    const signupByUser = new Map(
      (authUsers || []).map((u: any) => [u.user_id, u.created_at])
    )
    let newU = 0
    let returningU = 0
    for (const uid of loginUsersInPeriod) {
      const su = signupByUser.get(uid)
      if (su && new Date(su).getTime() >= new Date(startISO).getTime()) newU++
      else returningU++
    }

    return json({
      range: { startISO, endISO, days },
      kpis: {
        dau,
        wau,
        mau,
        totalUsers: totalUsersN,
        totalCaptures: totalCaptures || 0,
        avgCapturesPerUser,
        usersWithCapture,
        usersWithCaptureRate: totalUsersN ? usersWithCapture / totalUsersN : 0,
        loginsInPeriod: (loginsPeriod || []).length,
        avgLoginsPerUser,
        avgTimeBetweenCapturesHours,
      },
      series: {
        newUsersByWeek,
        loginsByWeek,
        capturesByDay,
      },
      topUsers,
      retention,
      newVsReturning: { new: newU, returning: returningU },
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

function bucketByDay(rows: any[], key: string) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = new Date(r[key])
    const k = d.toISOString().slice(0, 10)
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()].sort().map(([date, count]) => ({ date, count }))
}

function bucketByWeek(rows: any[], key: string) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = new Date(r[key])
    // ISO week start (Monday)
    const day = (d.getUTCDay() + 6) % 7
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
    const k = monday.toISOString().slice(0, 10)
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()].sort().map(([week, count]) => ({ week, count }))
}

function computeRetention(users: any[], captures: any[], logins: any[]) {
  // Activity = capture OR login
  const acts: Record<string, number[]> = {}
  for (const c of captures) {
    const t = new Date(c.created_at).getTime()
    ;(acts[c.user_id] ||= []).push(t)
  }
  for (const l of logins) {
    const t = new Date(l.created_at).getTime()
    ;(acts[l.user_id] ||= []).push(t)
  }

  const buckets = { d1: { n: 0, retained: 0 }, d7: { n: 0, retained: 0 }, d30: { n: 0, retained: 0 } }
  const now = Date.now()
  for (const u of users) {
    const signup = new Date(u.created_at).getTime()
    const userActs = acts[u.user_id] || []
    for (const [key, days] of [['d1', 1], ['d7', 7], ['d30', 30]] as const) {
      if (now - signup < days * 86400000) continue // cohort not mature
      buckets[key].n++
      const threshold = signup + days * 86400000
      const window = threshold + 86400000 // 1-day grace window
      if (userActs.some((t) => t >= threshold && t <= window)) {
        buckets[key].retained++
      } else if (
        // Also consider any activity after the day mark (cumulative retention)
        userActs.some((t) => t >= threshold)
      ) {
        buckets[key].retained++
      }
    }
  }
  return {
    j1: buckets.d1.n ? buckets.d1.retained / buckets.d1.n : 0,
    j7: buckets.d7.n ? buckets.d7.retained / buckets.d7.n : 0,
    j30: buckets.d30.n ? buckets.d30.retained / buckets.d30.n : 0,
    cohortSizes: { j1: buckets.d1.n, j7: buckets.d7.n, j30: buckets.d30.n },
  }
}

function avgGapHours(captures: any[]) {
  const byUser: Record<string, number[]> = {}
  for (const c of captures) {
    ;(byUser[c.user_id] ||= []).push(new Date(c.created_at).getTime())
  }
  const gaps: number[] = []
  for (const uid of Object.keys(byUser)) {
    const arr = byUser[uid].sort((a, b) => a - b)
    for (let i = 1; i < arr.length; i++) gaps.push(arr[i] - arr[i - 1])
  }
  if (!gaps.length) return 0
  const meanMs = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return meanMs / 3_600_000
}
