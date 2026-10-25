import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePinnedProfileCollections } from '@/hooks/usePinnedProfileCollections';

const state = vi.hoisted(() => ({
  pins: [] as { collection_key: string; pinned_at: string }[],
  inserted: null as Record<string, unknown> | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'pinned_profile_collections') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: state.pins }),
            single: async () => ({ data: state.inserted, error: state.inserted ? null : new Error('no row') }),
          }),
        }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              state.inserted = row;
              state.pins = state.pins.concat(row as { collection_key: string; pinned_at: string });
              return { data: row, error: null };
            },
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: async () => {
              state.pins = [];
              return { error: null };
            },
          }),
        }),
      };
    },
  },
}));

describe('Pinned standard collections (profile showcase)', () => {
  it('pins a standard collection with a timestamp', async () => {
    const { result } = renderHook(() => usePinnedProfileCollections('user-1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => { await result.current.togglePin('cat:Papillons'); });
    expect(state.inserted?.collection_key).toBe('cat:Papillons');
    expect(typeof state.inserted?.pinned_at).toBe('string');
    expect(result.current.isPinned('cat:Papillons')).toBe(true);
  });

  it('unpins a standard collection by deleting the row', async () => {
    const { result } = renderHook(() => usePinnedProfileCollections('user-1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.togglePin('cat:Papillons'); });
    await act(async () => { await result.current.togglePin('cat:Papillons'); });
    expect(result.current.isPinned('cat:Papillons')).toBe(false);
  });
});
