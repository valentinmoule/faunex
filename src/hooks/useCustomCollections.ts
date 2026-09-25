import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomCollection {
  id: string;
  name: string;
  created_at: string;
}

export interface CustomCollectionItem {
  id: string;
  collection_id: string;
  animal_name: string;
  scientific_name: string | null;
  created_at: string;
}

/**
 * Collections personnalisées de l'utilisateur (réservées au Premium —
 * la création est aussi refusée côté serveur par un trigger).
 */
export const useCustomCollections = (userId?: string) => {
  const [collections, setCollections] = useState<CustomCollection[]>([]);
  const [items, setItems] = useState<CustomCollectionItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setCollections([]);
      setItems([]);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const [{ data: cols }, { data: rows }] = await Promise.all([
        supabase
          .from('custom_collections')
          .select('id, name, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('custom_collection_items')
          .select('id, collection_id, animal_name, scientific_name, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
      ]);
      if (cancelled) return;
      setCollections(cols || []);
      setItems(rows || []);
      setLoaded(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Crée une collection. Retourne null si le serveur refuse (non Premium). */
  const createCollection = useCallback(
    async (name: string): Promise<CustomCollection | null> => {
      const trimmed = name.trim();
      if (!userId || !trimmed) return null;
      const { data, error } = await supabase
        .from('custom_collections')
        .insert({ user_id: userId, name: trimmed })
        .select('id, name, created_at')
        .single();
      if (error || !data) return null;
      setCollections((prev) => [...prev, data]);
      return data;
    },
    [userId],
  );

  const renameCollection = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!userId || !trimmed) return;
      const prev = collections;
      setCollections((p) => p.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
      const { error } = await supabase
        .from('custom_collections')
        .update({ name: trimmed })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) setCollections(prev);
    },
    [userId, collections],
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      if (!userId) return;
      const prevCols = collections;
      const prevItems = items;
      setCollections((p) => p.filter((c) => c.id !== id));
      setItems((p) => p.filter((i) => i.collection_id !== id));
      const { error } = await supabase
        .from('custom_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) {
        setCollections(prevCols);
        setItems(prevItems);
      }
    },
    [userId, collections, items],
  );

  const addItem = useCallback(
    async (collectionId: string, animalName: string, scientificName?: string | null) => {
      if (!userId || !animalName) return;
      if (items.some((i) => i.collection_id === collectionId && i.animal_name === animalName)) return;
      const optimistic: CustomCollectionItem = {
        id: `tmp-${Date.now()}`,
        collection_id: collectionId,
        animal_name: animalName,
        scientific_name: scientificName || null,
        created_at: new Date().toISOString(),
      };
      setItems((p) => [...p, optimistic]);
      const { data, error } = await supabase
        .from('custom_collection_items')
        .insert({
          collection_id: collectionId,
          user_id: userId,
          animal_name: animalName,
          scientific_name: scientificName || null,
        })
        .select('id, collection_id, animal_name, scientific_name, created_at')
        .single();
      if (error || !data) {
        setItems((p) => p.filter((i) => i.id !== optimistic.id));
      } else {
        setItems((p) => p.map((i) => (i.id === optimistic.id ? data : i)));
      }
    },
    [userId, items],
  );

  const removeItem = useCallback(
    async (collectionId: string, animalName: string) => {
      if (!userId) return;
      const prev = items;
      setItems((p) => p.filter((i) => !(i.collection_id === collectionId && i.animal_name === animalName)));
      const { error } = await supabase
        .from('custom_collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('user_id', userId)
        .eq('animal_name', animalName);
      if (error) setItems(prev);
    },
    [userId, items],
  );

  const itemsFor = useCallback(
    (collectionId: string) => items.filter((i) => i.collection_id === collectionId),
    [items],
  );

  const collectionsForSpecies = useCallback(
    (animalName: string) =>
      new Set(items.filter((i) => i.animal_name === animalName).map((i) => i.collection_id)),
    [items],
  );

  return {
    collections,
    items,
    loaded,
    createCollection,
    renameCollection,
    deleteCollection,
    addItem,
    removeItem,
    itemsFor,
    collectionsForSpecies,
  };
};
