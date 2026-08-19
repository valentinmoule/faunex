import { useCallback, useEffect, useState } from 'react';

/**
 * Species collections the user follows (races de chien, papillons, rapaces…).
 * Stored locally per user: it is a pure display preference derived from the
 * species groups, so no backend data is needed.
 */
const storageKey = (userId?: string) => `faunex.species-collections.${userId || 'anon'}`;

export const useSpeciesCollections = (userId?: string) => {
  const [collectionKeys, setCollectionKeys] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      setCollectionKeys(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setCollectionKeys([]);
    }
  }, [userId]);

  const persist = useCallback(
    (next: string[]) => {
      setCollectionKeys(next);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
    },
    [userId]
  );

  const addCollection = useCallback(
    (key: string) => persist(collectionKeys.includes(key) ? collectionKeys : [...collectionKeys, key]),
    [collectionKeys, persist]
  );

  const removeCollection = useCallback(
    (key: string) => persist(collectionKeys.filter((k) => k !== key)),
    [collectionKeys, persist]
  );

  return { collectionKeys, addCollection, removeCollection };
};
