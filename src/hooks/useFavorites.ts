import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Favoris de captures (Premium) — store partagé entre la fiche et le Bestiaire. */
let favIds = new Set<string>();
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => favIds;
const setIds = (next: Set<string>) => {
  favIds = next;
  emit();
};

export const useFavorites = (userId?: string) => {
  const ids = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    if (!userId || loadedFor === userId) return;
    loadedFor = userId;
    void supabase
      .from('capture_favorites')
      .select('capture_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!error) setIds(new Set((data || []).map((r) => r.capture_id)));
      });
  }, [userId]);

  const toggle = useCallback(
    async (captureId: string) => {
      if (!userId) return false;
      const was = favIds.has(captureId);
      const next = new Set(favIds);
      if (was) next.delete(captureId);
      else next.add(captureId);
      setIds(next);
      const { error } = was
        ? await supabase.from('capture_favorites').delete().eq('user_id', userId).eq('capture_id', captureId)
        : await supabase.from('capture_favorites').insert({ user_id: userId, capture_id: captureId });
      if (error) {
        const revert = new Set(favIds);
        if (was) revert.add(captureId);
        else revert.delete(captureId);
        setIds(revert);
        return false;
      }
      return true;
    },
    [userId],
  );

  return { favoriteIds: ids, isFavorite: (id: string) => ids.has(id), toggleFavorite: toggle };
};
