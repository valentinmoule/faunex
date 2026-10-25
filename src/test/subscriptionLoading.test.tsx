import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/paddle', () => ({ getPaddleEnvironment: () => 'live' }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const query = { select: () => query, eq: () => query, order: () => query, limit: () => query, maybeSingle: async () => ({ data: null }) };
      return query;
    },
    rpc: mocks.rpc,
    channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
    removeChannel: vi.fn(),
  },
}));
import { useSubscription } from '@/hooks/useSubscription';

describe('Premium loading state', () => {
  it('keeps verified Premium on remount while the entitlement refresh is pending', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    const first = renderHook(() => useSubscription('premium-remount'));
    await waitFor(() => expect(first.result.current.isPremium).toBe(true));
    first.unmount();
    let resolve: (value: { data: boolean; error: null }) => void = () => {};
    mocks.rpc.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const second = renderHook(() => useSubscription('premium-remount'));
    expect(second.result.current.isPremium).toBe(true);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
    expect(second.result.current.isPremium).toBe(true);
    await act(async () => resolve({ data: true, error: null }));
    expect(second.result.current.isPremium).toBe(true);
    second.unmount();
  });

  it('never marks uncached access as resolved before its verification completes', async () => {
    let resolve: (value: { data: boolean; error: null }) => void = () => {};
    mocks.rpc.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const hook = renderHook(() => useSubscription('premium-cold'));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(3));
    expect(hook.result.current.loading).toBe(true);
    await act(async () => resolve({ data: true, error: null }));
    expect(hook.result.current.isPremium).toBe(true);
    expect(hook.result.current.loading).toBe(false);
    hook.unmount();
  });
});