const EXACT_PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
])

/** Only browser-provided Web Push services may receive server-side requests. */
export function isTrustedWebPushEndpoint(value: string): boolean {
  try {
    const authority = value.match(/^https:\/\/([^/?#]+)/i)?.[1]
    if (!authority || authority.includes(':')) return false
    const endpoint = new URL(value)
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port) return false
    const host = endpoint.hostname.toLowerCase()
    return EXACT_PUSH_HOSTS.has(host) || host.endsWith('.notify.windows.com')
  } catch {
    return false
  }
}
