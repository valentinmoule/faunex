import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCustomCollections } from '@/hooks/useCustomCollections';

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], inserted: null as Record<string, unknown> | null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => ({
    select: () => ({ eq: () => ({ order: async () => ({ data: table === 'custom_collections' ? [{ id: 'collection-1', name: 'À découvrir', created_at: '2026-10-25' }] : state.rows }) }) }),
    insert: (row: Record<string, unknown>) => ({ select: () => ({ single: async () => {
      state.inserted = row;
      const data = { ...row, id: 'item-1', created_at: '2026-10-25' };
      state.rows.push(data);
      return { data, error: null };
    } }) }),
  }) },
}));

describe('Uncaptured species in custom collections', () => {
  it('saves species membership without a capture and refreshes another mounted collection view', async () => {
    const detail = renderHook(() => useCustomCollections('user-1'));
    const bestiary = renderHook(() => useCustomCollections('user-1'));
    await waitFor(() => expect(detail.result.current.loaded).toBe(true));
    await waitFor(() => expect(bestiary.result.current.loaded).toBe(true));
    await act(async () => { await detail.result.current.addItem('collection-1', 'Harfang des neiges', 'Bubo scandiacus'); });
    expect(state.inserted).toEqual({ collection_id: 'collection-1', user_id: 'user-1', animal_name: 'Harfang des neiges', scientific_name: 'Bubo scandiacus' });
    await waitFor(() => expect(bestiary.result.current.itemsFor('collection-1')).toHaveLength(1));
    expect(bestiary.result.current.collectionsForSpecies('Harfang des neiges').has('collection-1')).toBe(true);
  });
});