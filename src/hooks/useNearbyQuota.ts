import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const DAILY_NEARBY_LIMIT = 4;

/**
 * Daily quota for the "explorer dans cette zone" discovery search.
 * Free accounts: 4 per day. Premium: unlimited.
 */
export const useNearbyQuota = (userId?: string) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc('nearby_searches_remaining_today');
    if (!error && typeof data === 'number') setRemaining(data);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Consumes one slot. Returns false when the quota is already exhausted. */
  const consume = useCallback(async () => {
    const { data, error } = await supabase.rpc('record_nearby_search');
    if (error) {
      if (String(error.message || '').includes('DAILY_NEARBY_LIMIT_REACHED')) {
        setRemaining(0);
      }
      return false;
    }
    if (typeof data === 'number') setRemaining(data);
    return true;
  }, []);

  return {
    remaining,
    unlimited: remaining !== null && remaining > DAILY_NEARBY_LIMIT,
    exhausted: remaining !== null && remaining <= 0,
    refresh,
    consume,
  };
};
