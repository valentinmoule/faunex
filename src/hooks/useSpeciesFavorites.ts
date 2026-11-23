import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Clé de comparaison d'un nom d'espèce (casse et espaces de bord ignorés). */
export const speciesFavoriteKey = (name: string) => name.trim().toLocaleLowerCase('fr');

/**
 * Espèces favorites : fiches mises en favori (capturées ou non) + espèces
 * dont une capture porte le marque-page.
 */
export const buildFavoriteSpeciesKeys = (
  favoriteSpecies: Iterable<string>,
  captures: { id: string; name: string }[],
  favoriteCaptureIds: Set<string>,
): Set<string> => {
  const keys = new Set(Array.from(favoriteSpecies, speciesFavoriteKey));
  for (const c of captures) if (favoriteCaptureIds.has(c.id)) keys.add(speciesFavoriteKey(c.name));
  return keys;
};

/** Favoris d'espèces (fiches du Bestiaire, capturées ou non) — store partagé. */
let favKeys = new Set<string>();
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => favKeys;
const setKeys = (next: Set<string>) => {
  favKeys = next;
  emit();
};

export const useSpeciesFavorites = (userId?: string) => {
  const keys = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    if (!userId || loadedFor === userId) return;
    loadedFor = userId;
    setKeys(new Set());
    void supabase
      .from('species_favorites')
      .select('animal_name')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!error) setKeys(new Set((data || []).map((r) => speciesFavoriteKey(r.animal_name))));
      });
  }, [userId]);

  /** Ajoute ou retire une espèce ; `want` force l'état voulu. */
  const setFavorite = useCallback(
    async (animalName: string, want: boolean) => {
      if (!userId) return false;
      const key = speciesFavoriteKey(animalName);
      if (!key || favKeys.has(key) === want) return true;
      const next = new Set(favKeys);
      if (want) next.add(key);
      else next.delete(key);
      setKeys(next);
      const { error } = want
        ? await supabase.from('species_favorites').insert({ user_id: userId, animal_name: animalName.trim() })
        : await supabase.from('species_favorites').delete().eq('user_id', userId).ilike('animal_name', animalName.trim().replace(/[\\%_]/g, '\\$&'));
      // 23505 : déjà en favori (autre appareil) → l'état voulu est atteint.
      if (error && error.code !== '23505') {
        const revert = new Set(favKeys);
        if (want) revert.delete(key);
        else revert.add(key);
        setKeys(revert);
        return false;
      }
      return true;
    },
    [userId],
  );

  return {
    favoriteSpecies: keys,
    isSpeciesFavorite: (name: string) => keys.has(speciesFavoriteKey(name)),
    setSpeciesFavorite: setFavorite,
  };
};
