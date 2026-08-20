import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Species collections the user follows (races de chien, papillons, rapaces…).
 * Persisted in the backend so the selection survives logouts, cache clears and
 * device changes. The local copy is only a migration path for users whose
 * collections were previously stored in the browser.
 */
const storageKey = (userId?: string) => `faunex.species-collections.${userId || 'anon'}`;

const readLocal = (userId?: string): string[] => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const useSpeciesCollections = (userId?: string) => {
  const [collectionKeys, setCollectionKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setCollectionKeys([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('user_species_collections')
        .select('collection_key')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (cancelled || error) return;

      const remote = (data || []).map((row) => row.collection_key);
      const legacy = readLocal(userId).filter((key) => !remote.includes(key));

      // One-time migration of collections that only existed in the browser.
      if (legacy.length > 0) {
        await supabase
          .from('user_species_collections')
          .insert(legacy.map((collection_key) => ({ user_id: userId, collection_key })));
        if (cancelled) return;
      }
      try {
        localStorage.removeItem(storageKey(userId));
      } catch {
        /* ignore */
      }
      setCollectionKeys([...remote, ...legacy]);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addCollection = useCallback(
    async (key: string) => {
      if (!userId || collectionKeys.includes(key)) return;
      setCollectionKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      const { error } = await supabase
        .from('user_species_collections')
        .insert({ user_id: userId, collection_key: key });
      if (error) setCollectionKeys((prev) => prev.filter((k) => k !== key));
    },
    [collectionKeys, userId]
  );

  const removeCollection = useCallback(
    async (key: string) => {
      if (!userId) return;
      setCollectionKeys((prev) => prev.filter((k) => k !== key));
      const { error } = await supabase
        .from('user_species_collections')
        .delete()
        .eq('user_id', userId)
        .eq('collection_key', key);
      if (error) setCollectionKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    },
    [userId]
  );

  return { collectionKeys, addCollection, removeCollection };
};
