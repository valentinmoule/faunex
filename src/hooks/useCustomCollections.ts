import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const COLLECTIONS_CHANGED = 'faunex:custom-collections-changed';
const notifyCollectionsChanged = () => window.dispatchEvent(new Event(COLLECTIONS_CHANGED));

export interface CustomCollection {
  id: string;
  name: string;
  cover_image: string | null;
  pinned_at: string | null;
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
          .select('id, name, cover_image, pinned_at, created_at')
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
    const refresh = () => { void load(); };
    window.addEventListener(COLLECTIONS_CHANGED, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(COLLECTIONS_CHANGED, refresh);
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
        .select('id, name, cover_image, pinned_at, created_at')
        .single();
      if (error || !data) return null;
      setCollections((prev) => [...prev, data]);
      notifyCollectionsChanged();
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
        notifyCollectionsChanged();
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
      else notifyCollectionsChanged();
    },
    [userId, items],
  );

  /** Définit (ou retire, avec null) la photo d'illustration choisie par l'utilisateur. */
  const setCoverImage = useCallback(
    async (id: string, url: string | null) => {
      if (!userId) return;
      const prev = collections;
      setCollections((p) => p.map((c) => (c.id === id ? { ...c, cover_image: url } : c)));
      const { error } = await supabase
        .from('custom_collections')
        .update({ cover_image: url })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) setCollections(prev);
      else notifyCollectionsChanged();
    },
    [userId, collections],
  );

  /** Épingle (ou désépingle) la collection sur la vitrine du profil. */
  const togglePin = useCallback(
    async (id: string) => {
      if (!userId) return;
      const target = collections.find((c) => c.id === id);
      if (!target) return;
      const pinnedAt = target.pinned_at ? null : new Date().toISOString();
      const prev = collections;
      setCollections((p) => p.map((c) => (c.id === id ? { ...c, pinned_at: pinnedAt } : c)));
      const { error } = await supabase
        .from('custom_collections')
        .update({ pinned_at: pinnedAt })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) setCollections(prev);
      else notifyCollectionsChanged();
    },
    [userId, collections],
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
    setCoverImage,
    togglePin,
    addItem,
    removeItem,
    itemsFor,
    collectionsForSpecies,
  };
};
