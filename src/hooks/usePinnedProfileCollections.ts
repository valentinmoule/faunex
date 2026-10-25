import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PinnedProfileCollection {
  collection_key: string;
  pinned_at: string;
}

/**
 * Collections standards (catégories, groupes d'espèces) épinglées sur la
 * vitrine du profil. Épinglage par le propriétaire uniquement ; la vitrine
 * publique lit les épingles de n'importe quel explorateur.
 */
export const usePinnedProfileCollections = (userId?: string) => {
  const [pins, setPins] = useState<PinnedProfileCollection[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPins([]);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('pinned_profile_collections')
        .select('collection_key, pinned_at')
        .eq('user_id', userId)
        .order('pinned_at', { ascending: true });
      if (cancelled) return;
      setPins(data || []);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  /** Épingle (ou désépingle) la collection sur la vitrine du profil. */
  const togglePin = useCallback(
    async (collectionKey: string) => {
      if (!userId) return;
      const target = pins.find((p) => p.collection_key === collectionKey);
      const prev = pins;
      if (target) {
        setPins((p) => p.filter((x) => x.collection_key !== collectionKey));
        const { error } = await supabase
          .from('pinned_profile_collections')
          .delete()
          .eq('user_id', userId)
          .eq('collection_key', collectionKey);
        if (error) setPins(prev);
      } else {
        const row = { collection_key: collectionKey, pinned_at: new Date().toISOString() };
        setPins((p) => [...p, row]);
        const { data, error } = await supabase
          .from('pinned_profile_collections')
          .insert(row)
          .select('collection_key, pinned_at')
          .single();
        if (error || !data) setPins(prev);
        else setPins((p) => p.map((x) => (x.collection_key === collectionKey ? data : x)));
      }
    },
    [userId, pins],
  );

  const isPinned = useCallback(
    (collectionKey: string) => pins.some((p) => p.collection_key === collectionKey),
    [pins],
  );

  return { pins, loaded, togglePin, isPinned };
};
