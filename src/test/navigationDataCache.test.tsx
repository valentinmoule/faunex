import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), activeUser: 'alice', calls: [] as string[], pageSize: 1 }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
import { useExplorerData } from '@/hooks/useExplorerData';
import { headerProfileKey, useHeaderProfile, useUnreadNotifications } from '@/hooks/useHeaderData';

describe('Account-scoped navigation data', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.calls = []; mocks.activeUser = 'alice'; mocks.pageSize = 1;
    mocks.from.mockImplementation((table: string) => {
      const filters: Record<string, unknown> = {};
      let offset = 0;
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'order', 'in']) chain[method] = () => chain;
      chain.eq = (key: string, value: unknown) => { filters[key] = value; return chain; };
      chain.range = (start: number) => { offset = start; return chain; };
      chain.maybeSingle = () => chain;
      chain.then = (resolve: (data: unknown) => unknown) => {
        mocks.calls.push(table);
        const uid = filters.user_id ?? mocks.activeUser;
        let data: unknown = [];
        if (table === 'explorer_follows') data = filters.follower_id ? [{ following_id: 'friend' }] : [];
        if (table === 'profiles') data = filters.user_id ? { display_name: uid, level: 7, xp: 80, xp_to_next: 100 } : [{ user_id: 'friend', display_name: 'Friend', level: 3, total_captures: 4 }];
        if (table === 'captures') data = Array.from({ length: mocks.pageSize }, (_, i) => ({ id: `${uid}-photo-${offset + i}`, user_id: 'friend', animal_name: 'Koala', image_url: '/koala.webp', created_at: '2026-11-28T12:00:00Z' }));
        return Promise.resolve({ data, count: 2, error: null }).then(resolve);
      };
      return chain;
    });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => { client.clear(); });
  it('shows cached feed and follows on revisit without another network read, including local likes', async () => {
    const first = renderHook(() => useExplorerData('alice'), { wrapper });
    await waitFor(() => expect(first.result.current.posts).toHaveLength(1));
    await act(async () => { first.result.current.setLikedPosts(new Set(['alice-photo-0'])); first.result.current.setLikeCounts({ 'alice-photo-0': 1 }); });
    const count = mocks.calls.length;
    first.unmount();
    const revisit = renderHook(() => useExplorerData('alice'), { wrapper });
    expect(revisit.result.current.feedLoading).toBe(false);
    expect(revisit.result.current.posts[0].id).toBe('alice-photo-0');
    expect(revisit.result.current.likedPosts.has('alice-photo-0')).toBe(true);
    expect(revisit.result.current.likeCounts['alice-photo-0']).toBe(1);
    expect(revisit.result.current.following).toHaveLength(1);
    await act(async () => {});
    expect(mocks.calls.length).toBe(count);
    revisit.unmount();
  });
  it('keeps pagination and its offset on revisit, without duplicate next-page requests', async () => {
    mocks.pageSize = 25;
    const hook = renderHook(() => useExplorerData('alice'), { wrapper });
    await waitFor(() => expect(hook.result.current.posts).toHaveLength(25));
    await act(async () => { await Promise.all([hook.result.current.fetchFeedPage(['friend'], 25), hook.result.current.fetchFeedPage(['friend'], 25)]); });
    expect(hook.result.current.posts).toHaveLength(50);
    expect(new Set(hook.result.current.posts.map(p => p.id)).size).toBe(50);
    const reads = mocks.calls.filter(t => t === 'captures').length;
    hook.unmount();
    const revisit = renderHook(() => useExplorerData('alice'), { wrapper });
    expect(revisit.result.current.feedOffset).toBe(50);
    expect(revisit.result.current.posts).toHaveLength(50);
    expect(mocks.calls.filter(t => t === 'captures').length).toBe(reads);
    revisit.unmount();
  });
  it('does not show a previous account feed while the new account loads', async () => {
    const hook = renderHook(({ uid }) => useExplorerData(uid), { wrapper, initialProps: { uid: 'alice' } });
    await waitFor(() => expect(hook.result.current.posts).toHaveLength(1));
    mocks.activeUser = 'bob';
    hook.rerender({ uid: 'bob' });
    expect(hook.result.current.posts).toEqual([]);
    expect(hook.result.current.following).toEqual([]);
    await waitFor(() => expect(hook.result.current.posts[0]?.id).toBe('bob-photo-0'));
    hook.unmount();
  });
  it('shares profile and unread reads and immediately updates all headers after invalidation', async () => {
    const first = renderHook(() => ({ profile: useHeaderProfile('alice'), unread: useUnreadNotifications('alice') }), { wrapper });
    const second = renderHook(() => ({ profile: useHeaderProfile('alice'), unread: useUnreadNotifications('alice') }), { wrapper });
    await waitFor(() => expect(first.result.current.profile.data?.level).toBe(7));
    expect(mocks.calls.filter(t => t === 'profiles')).toHaveLength(1);
    expect(mocks.calls.filter(t => t === 'notifications')).toHaveLength(1);
    await act(async () => { await client.invalidateQueries({ queryKey: headerProfileKey('alice') }); });
    expect(mocks.calls.filter(t => t === 'profiles')).toHaveLength(2);
    expect(second.result.current.profile.data?.level).toBe(7);
    expect(second.result.current.unread).toBe(2);
    first.unmount(); second.unmount();
  });
});