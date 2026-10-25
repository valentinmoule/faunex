import { nativePushPreference, type NativePushPayload } from './native-push-policy.ts'

/** Only trusted event handlers call this helper; recipients never come from a push request. */
export async function sendNativePush(supabase: any, userId: string, payload: NativePushPayload, template?: string) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const connectionKey = Deno.env.get('FIREBASE_MESSAGING_API_KEY')
  if (!apiKey || !connectionKey) return { skipped: 'not_configured' }
  if (template) {
    const preference = nativePushPreference(template)
    const { data: profile, error } = await supabase.from('profiles')
      .select('notify_push_likes, notify_push_comments, notify_push_follows, marketing_emails').eq('user_id', userId).maybeSingle()
    if (error || !profile) return { skipped: 'preferences_unavailable' }
    if (preference && profile[preference] === false) return { skipped: 'preference_disabled' }
    if (['inactivity-email', 'reengagement-j2', 'no-capture-j7'].includes(template) && profile.marketing_emails !== true) return { skipped: 'marketing_disabled' }
  }
  const { data: devices, error } = await supabase.from('native_push_devices').select('id, token').eq('user_id', userId)
  if (error) throw new Error('Native device lookup failed')
  if (!devices?.length) return { skipped: 'no_devices' }
  const { data: claimed, error: claimError } = await supabase.rpc('try_claim_notification', {
    p_key: `native-${userId}-${payload.tag}`, p_ttl_seconds: 86400,
  })
  if (claimError) throw new Error('Native notification claim failed')
  if (!claimed) return { skipped: 'duplicate' }
  let success = 0
  let failure = 0
  for (const device of devices) {
    try {
      const response = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: {
          token: device.token,
          notification: { title: payload.title, body: payload.body },
          data: { path: payload.url, tag: payload.tag },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        } }),
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) {
        const details = await response.text()
        // Tokens are private: never log provider messages which may echo the token.
        let stale = false
        try { stale = JSON.parse(details)?.error?.details?.some((d: any) => d.errorCode === 'UNREGISTERED') === true } catch { /* not JSON */ }
        if (stale) await supabase.from('native_push_devices').delete().eq('id', device.id)
        console.error('Native push failed', { status: response.status, stale })
        failure++
      } else { success++ }
    } catch { failure++; console.error('Native push transport failed') }
  }
  return { success, failure }
}