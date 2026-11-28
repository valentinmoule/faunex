import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
import { useCaptureQuota } from '@/hooks/useCaptureQuota';

describe('Capture quota resumes from the server unlock time', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  beforeEach(() => { vi.useFakeTimers(); mocks.rpc.mockReset(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
  afterEach(() => { client.clear(); vi.useRealTimers(); });
  it('re-enables analyses after the one-hour pause without reopening the camera', async () => {
    const retryAt = new Date(Date.now() + 3_600_000).toISOString();
    mocks.rpc.mockResolvedValueOnce({ data: { remaining: 0, reason: 'premium_pause', retry_at: retryAt }, error: null });
    const hook = renderHook(() => useCaptureQuota('premium'), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(hook.result.current.exhausted).toBe(true);
    mocks.rpc.mockResolvedValueOnce({ data: { remaining: 200, reason: 'available', retry_at: null }, error: null });
    await act(async () => { await vi.advanceTimersByTimeAsync(3_600_250); });
    expect(hook.result.current.exhausted).toBe(false);
    expect(hook.result.current.remaining).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    hook.unmount();
  });
  it('does not debit anything when shelving the 200th identified photo during the pause', async () => {
    mocks.rpc.mockResolvedValue({ data: { remaining: 0, reason: 'premium_pause', retry_at: new Date(Date.now() + 3_600_000).toISOString() }, error: null });
    const hook = renderHook(() => useCaptureQuota('premium'), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    await act(async () => { expect(await hook.result.current.consume()).toBe(true); });
    expect(mocks.rpc.mock.calls.every(([name]) => name === 'get_ai_analysis_status')).toBe(true);
    hook.unmount();
  });
  it('ignores a previous account quota arriving after switching accounts', async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.rpc.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const hook = renderHook(({ userId }) => useCaptureQuota(userId), { initialProps: { userId: 'old' }, wrapper });
    mocks.rpc.mockResolvedValueOnce({ data: { remaining: 4, reason: 'available', retry_at: null }, error: null });
    hook.rerender({ userId: 'new' });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    await act(async () => resolve({ data: { remaining: 0, reason: 'premium_daily_limit', retry_at: null }, error: null }));
    expect(hook.result.current.remaining).toBe(4);
    hook.unmount();
  });
  it('shares the quota across headers and revisits but forces a fresh read before an analysis', async () => {
    mocks.rpc.mockResolvedValue({ data: { remaining: 4, reason: 'available', retry_at: null }, error: null });
    const first = renderHook(() => useCaptureQuota('free'), { wrapper });
    const second = renderHook(() => useCaptureQuota('free'), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    first.unmount(); second.unmount();
    const revisit = renderHook(() => useCaptureQuota('free'), { wrapper });
    expect(revisit.result.current.remaining).toBe(4);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    mocks.rpc.mockResolvedValue({ data: { remaining: 3, reason: 'available', retry_at: null }, error: null });
    await act(async () => { expect(await revisit.result.current.fetchRemaining()).toBe(3); await vi.advanceTimersByTimeAsync(1); });
    expect(revisit.result.current.remaining).toBe(3);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    revisit.unmount();
  });
});