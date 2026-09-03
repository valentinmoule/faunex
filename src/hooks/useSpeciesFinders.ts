import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Cache mémoire : nombre de naturalistes distincts ayant capturé une espèce. */
const findersCache = new Map<string, number>();

/**
 * Retourne le nombre de naturalistes ayant capturé l'espèce (undefined tant que
 * la valeur n'est pas connue). Passe `enabled=false` pour ne rien charger.
 */
export const useSpeciesFinders = (name?: string | null, enabled = true) => {
  const key = (name || '').trim().toLowerCase();
  const [count, setCount] = useState<number | undefined>(() =>
    key ? findersCache.get(key) : undefined,
  );

  useEffect(() => {
    if (!enabled || !key) return;
    const cached = findersCache.get(key);
    if (cached !== undefined) {
      setCount(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase.rpc as any)('species_finder_count', { _name: key });
      if (cancelled || error || typeof data !== 'number') return;
      findersCache.set(key, data);
      setCount(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return count;
};

export default useSpeciesFinders;
