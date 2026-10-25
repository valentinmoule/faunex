import { describe, it, expect } from 'vitest';
import { nativeEmailPayload, nativePushPreference, safeNativePath } from '../../supabase/functions/_shared/native-push-policy';

describe('native notification routing', () => {
  it('covers every app email category without authentication secrets', () => {
    for (const name of ['account-blocked', 'inactivity-email', 'reengagement-j2', 'no-capture-j7', 'premium-recap', 'capture-approved', 'capture-rejected']) {
      expect(nativeEmailPayload(name, {}, 'fr', 'event')?.tag).toBe('event');
    }
    expect(nativeEmailPayload('reset-password', {}, 'fr', 'event')).toBeNull();
  });
  it('preserves each social push preference independently', () => {
    expect(nativePushPreference('capture-like')).toBe('notify_push_likes');
    expect(nativePushPreference('capture-comment')).toBe('notify_push_comments');
    expect(nativePushPreference('new-follower')).toBe('notify_push_follows');
  });
  it('does not replace a chosen rejection reason by duplicate detection', () => {
    const payload = nativeEmailPayload('capture-rejected', { reason: 'human', duplicateName: 'Traquet motteux' }, 'en', 'event');
    expect(payload?.url).toBe('/capture');
    expect(payload?.body).toContain('humans');
    expect(payload?.body).not.toContain('already');
  });
  it('rejects off-origin push destinations', () => {
    expect(safeNativePath('https://evil.example/home')).toBe('/notifications');
    expect(safeNativePath('javascript:alert(1)')).toBe('/notifications');
    expect(safeNativePath('/home?capture=123')).toBe('/home?capture=123');
  });
});