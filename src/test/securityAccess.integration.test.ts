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
});