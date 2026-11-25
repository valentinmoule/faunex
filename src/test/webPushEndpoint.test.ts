import { describe, expect, it } from 'vitest'
import { isTrustedWebPushEndpoint } from '../../supabase/functions/_shared/web-push-endpoint'

describe('Web Push destination validation', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/device-token',
    'https://updates.push.services.mozilla.com/wpush/v2/device-token',
    'https://wns2-par02p.notify.windows.com/w/?token=device-token',
    'https://web.push.apple.com/Q123device-token',
  ])('keeps the browser provider %s', endpoint => {
    expect(isTrustedWebPushEndpoint(endpoint)).toBe(true)
  })

  it.each([
    'http://fcm.googleapis.com/fcm/send/device-token',
    'https://fcm.googleapis.com.evil.example/device',
    'https://evil.example/collect',
    'https://fcm.googleapis.com@evil.example/device',
    'https://fcm.googleapis.com:443/fcm/send/device',
    'https://127.0.0.1/private',
    'not-a-url',
  ])('rejects an untrusted destination %s', endpoint => {
    expect(isTrustedWebPushEndpoint(endpoint)).toBe(false)
  })
})
