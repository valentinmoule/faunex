import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';

// Run after `lovable auth-session --json --self`. No credentials are committed.
const sessionPath = `${homedir()}/.cache/lovable-auth/session.json`;
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const available = existsSync(sessionPath) && Boolean(url && key);

describe.skipIf(!available)('Hosted access controls', () => {
  const session = available
    ? JSON.parse(readFileSync(sessionPath, 'utf8')).session
    : null;
  const call = (name: string, body: unknown, authenticated = false) => fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(authenticated ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  it.each(['identify-animal', 'nearby-animals', 'rewrite-species-descriptions', 'notify-friend-request', 'notify-capture-interaction'])(
    '%s refuses anonymous requests', async (name) => {
      expect((await call(name, {})).status).toBe(401);
    }, 45_000,
  );

  it('refuses an actor different from the authenticated user', async () => {
    const response = await call('notify-capture-interaction', {
      capture_id: '00000000-0000-0000-0000-000000000001',
      actor_id: '00000000-0000-0000-0000-000000000002',
      type: 'like',
    }, true);
    expect(response.status).toBe(403);
  }, 45_000);

  it('allows an authenticated identification cache probe', async () => {
    const response = await call('identify-animal', { probe: true, imageHash: 'a'.repeat(64) }, true);
    expect(response.status).toBe(200);
    expect((await response.json()).reason).toBe('cache_miss');
  }, 45_000);

  it('rejects coordinates outside geographic bounds before consuming a search', async () => {
    const response = await call('nearby-animals', { latitude: 999, longitude: 0 }, true);
    expect(response.status).toBe(400);
  }, 45_000);

  const restHeaders = () => ({ apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' });

  const rpc = (name: string, body: unknown) => fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: restHeaders(), body: JSON.stringify(body),
  });

  it('rejects an invented badge without changing profile XP', async () => {
    const before = await (await rpc('get_my_profile', {})).json();
    const response = await rpc('claim_badge', { p_badge_id: 'invented_reward_security_test', p_xp_reward: 500 });
    expect(response.status).toBe(200);
    expect(await response.json()).toBe(false);
    const after = await (await rpc('get_my_profile', {})).json();
    expect([after.level, after.xp]).toEqual([before.level, before.xp]);
  }, 45_000);

  it.each(['zone_00000000-0000-0000-0000-000000000001', 'collection_invented_security_test'])(
    'rejects an unowned or unknown reward %s', async (id) => {
      const response = await rpc('claim_badge', { p_badge_id: id, p_xp_reward: 500 });
      expect(response.status).toBe(200);
      expect(await response.json()).toBe(false);
    }, 45_000,
  );

  it('rejects an invalid timezone on the device-time claim path', async () => {
    const response = await rpc('claim_badge_in_timezone', { p_badge_id: 'early_bird', p_xp_reward: 500, p_timezone: 'invalid/timezone' });
    expect(response.status).toBe(200);
    expect(await response.json()).toBe(false);
  }, 45_000);

  it('never credits a previously claimed badge twice', async () => {
    const read = await fetch(`${url}/rest/v1/user_badges?select=badge_id&user_id=eq.${session.user.id}&limit=1`, { headers: restHeaders() });
    const badges = await read.json();
    expect(badges.length).toBe(1);
    const before = await (await rpc('get_my_profile', {})).json();
    const replies = await Promise.all([0, 500].map((amount) => rpc('claim_badge', { p_badge_id: badges[0].badge_id, p_xp_reward: amount })));
    expect(await Promise.all(replies.map((r) => r.json()))).toEqual([false, false]);
    const after = await (await rpc('get_my_profile', {})).json();
    expect([after.level, after.xp]).toEqual([before.level, before.xp]);
  }, 45_000);

  it('refuses direct XP grants', async () => {
    const response = await rpc('grant_xp', { p_user_id: session.user.id, p_amount: 500 });
    expect([403, 404]).toContain(response.status);
  }, 45_000);

  it('preserves public profile reads for the signed-in experience', async () => {
    const response = await fetch(`${url}/rest/v1/profiles?select=user_id,username,level&user_id=eq.${session.user.id}`, { headers: restHeaders() });
    expect(response.status).toBe(200);
    expect((await response.json())[0].user_id).toBe(session.user.id);
  }, 45_000);

  it('keeps private email preferences behind the owner RPC', async () => {
    const direct = await fetch(`${url}/rest/v1/profiles?select=notify_email_likes`, { headers: restHeaders() });
    expect(direct.status).toBe(403);
    const own = await fetch(`${url}/rest/v1/rpc/get_my_profile`, { method: 'POST', headers: restHeaders(), body: '{}' });
    expect(own.status).toBe(200);
    const profile = await own.json();
    expect(profile.user_id).toBe(session.user.id);
    expect(typeof profile.notify_email_likes).toBe('boolean');
  }, 45_000);

  it('refuses direct league point grants from an authenticated caller', async () => {
    const response = await fetch(`${url}/rest/v1/rpc/league_add_points`, {
      method: 'POST', headers: restHeaders(),
      body: JSON.stringify({ p_user_id: session.user.id, p_points: 0 }),
    });
    expect([403, 404]).toContain(response.status);
  }, 45_000);
});