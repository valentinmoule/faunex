/** Scheduler only; eligibility and UTC dates are always checked by the server. */
export function millisecondsUntilUtcMidnight(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime() + 250;
}

export interface WalletState { enabled: boolean; balance: number; debt: number; earned: number }
export function parseWallet(value: unknown): WalletState | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (typeof data.enabled !== 'boolean' || typeof data.balance !== 'number' || data.balance < 0) return null;
  return { enabled: data.enabled, balance: data.balance, debt: Number(data.debt ?? 0), earned: Number(data.earned ?? 0) };
}