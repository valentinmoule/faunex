import { describe, it, expect, vi } from 'vitest';
import { singleFlight } from '@/lib/singleFlight';

describe('concurrent read coalescing', () => {
  it('executes one read for concurrent consumers and refreshes after completion', async () => {
    const read = singleFlight<number>();
    const load = vi.fn(async () => 42);
    const a = read('account:refresh', load);
    const b = read('account:refresh', load);
    expect(a).toBe(b);
    expect(await a).toBe(42);
    await read('account:refresh', load);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('never shares results across accounts or invalidation keys', async () => {
    const read = singleFlight<number>();
    expect(await Promise.all([read('alice:0', async () => 1), read('bob:0', async () => 2), read('alice:1', async () => 3)])).toEqual([1, 2, 3]);
  });
  it('releases a failed request so the next attempt can recover', async () => {
    const read = singleFlight<number>();
    await expect(read('account', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    expect(await read('account', async () => 9)).toBe(9);
  });
});