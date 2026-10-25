import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useCollectionCovers } from '@/hooks/useCollectionCovers';

const state = vi.hoisted(() => ({ rows: [] as { collection_key: string; capture_id: string }[], written: {} as Record<string, unknown>, error: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: async () => ({ data: state.rows }) }),
  upsert: async (row: Record<string, unknown>) => { state.written = row; return { error: state.error ? {} : null }; },
  delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
}) } }));

describe('Personal collection covers', () => {
  beforeEach(() => { state.rows = []; state.written = {}; state.error = false; });
  it.each(['cat:Oiseaux', 'butterflies', 'zone:territory-1'])('persists a personal capture for %s', async key => {
    const hook = renderHook(() => useCollectionCovers('user-1'));
    await act(async () => { await hook.result.current.setCover(key, 'capture-1'); });
    expect(state.written).toEqual({ user_id: 'user-1', collection_key: key, capture_id: 'capture-1' });
    expect(hook.result.current.covers[key]).toBe('capture-1');
  });
  it('loads the saved capture after remount', async () => {
    state.rows = [{ collection_key: 'butterflies', capture_id: 'capture-1' }];
    const hook = renderHook(() => useCollectionCovers('user-1'));
    await waitFor(() => expect(hook.result.current.covers.butterflies).toBe('capture-1'));
  });
  it('does not display a rejected save', async () => {
    state.error = true;
    const hook = renderHook(() => useCollectionCovers('user-1'));
    await act(async () => { expect(await hook.result.current.setCover('butterflies', 'other-users-capture')).toBe(false); });
    expect(hook.result.current.covers.butterflies).toBeUndefined();
  });
});