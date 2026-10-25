import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCustomCollections } from '@/hooks/useCustomCollections';

const state = vi.hoisted(() => ({
  collections: [{ id: 'collection-1', name: 'À découvrir', cover_image: null, pinned_at: null as string | null, created_at: '2026-10-25' }],
  updated: null as Record<string, unknown> | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: table === 'custom_collections' ? state.collections : [] }) }),
      }),
      update: (row: Record<string, unknown>) => ({
        eq: () => ({ eq: async () => {
          state.updated = row;
          state.collections = state.collections.map((c) => ({ ...c, ...row }));
          return { error: null };
        } }),
      }),
    }),
  },
}));

describe('Pinned custom collections (profile showcase)', () => {
  it('pins a collection with a timestamp and refreshes other mounted views', async () => {
    const detail = renderHook(() => useCustomCollections('user-1'));
    const bestiary = renderHook(() => useCustomCollections('user-1'));
    await waitFor(() => expect(detail.result.current.loaded).toBe(true));
    await waitFor(() => expect(bestiary.result.current.loaded).toBe(true));

    await act(async () => { await detail.result.current.togglePin('collection-1'); });
    expect(typeof state.updated?.pinned_at).toBe('string');
    await waitFor(() => expect(bestiary.result.current.collections[0].pinned_at).toBeTruthy());
  });

  it('unpins a collection by clearing the timestamp', async () => {
    const { result } = renderHook(() => useCustomCollections('user-1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.togglePin('collection-1'); });
    expect(state.updated?.pinned_at).toBeNull();
    expect(result.current.collections[0].pinned_at).toBeNull();
  });
});
