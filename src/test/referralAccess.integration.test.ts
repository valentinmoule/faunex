import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
const path = `${homedir()}/.cache/lovable-auth/session.json`;
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
describe.skipIf(!existsSync(path) || !url || !key)('Hosted referral access', () => {
  const rpc = (name: string, body: unknown, signedIn = true) => {
    const session = JSON.parse(readFileSync(path, 'utf8')).session;
    return fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: {
      apikey: key, 'Content-Type': 'application/json', ...(signedIn ? { Authorization: `Bearer ${session.access_token}` } : {}),
    }, body: JSON.stringify(body) });
  };
  it('keeps a stable personal code across reads', async () => {
    const a = await rpc('my_referral_code', {}); const b = await rpc('my_referral_code', {});
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    const code = await a.json(); expect(code).toMatch(/^[A-F0-9]{12}$/); expect(await b.json()).toBe(code);
  });
  it('rejects self-referral', async () => {
    const code = await (await rpc('my_referral_code', {})).json();
    const response = await rpc('reserve_referral', { p_code: code, p_env: 'sandbox' });
    expect(response.ok).toBe(false); expect((await response.json()).message).toBe('self_referral');
  });
  it('does not let clients grant their own confirmed payment rewards', async () => {
    const response = await rpc('confirm_paid_referral', { p_referral: '00000000-0000-0000-0000-000000000001', p_transaction: 'fake', p_subscription: 'fake', p_env: 'sandbox', p_customer: 'fake', p_paid_start: new Date().toISOString(), p_paid_end: new Date().toISOString() });
    expect([403, 404]).toContain(response.status);
  });
  it('does not allow anonymous code creation', async () => {
    expect([401, 403]).toContain((await rpc('my_referral_code', {}, false)).status);
  });
});