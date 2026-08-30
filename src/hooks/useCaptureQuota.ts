import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const DAILY_CAPTURE_LIMIT = 4;

/**
 * Daily capture quota: every AI analysis consumes one slot, even when the
 * animal is not added to the Faunex.
 */
export const useCaptureQuota = (userId?: string) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc('captures_remaining_today');
    if (!error && typeof data === 'number') setRemaining(data);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Consumes one slot. Returns false when the quota is already exhausted. */
  const consume = useCallback(async () => {
    const { data, error } = await supabase.rpc('record_capture_attempt');
    if (error) {
      if (JSON.stringify(error.message || '').includes('DAILY_CAPTURE_LIMIT_REACHED')) {
        setRemaining(0);
      }
      return false;
    }
    if (typeof data === 'number') setRemaining(data);
    return true;
  }, []);

  /**
   * Rend le slot débité juste avant : une erreur réseau, un refus serveur ou un
   * doublon détecté après coup ne doit jamais coûter une capture à l'explorateur.
   */
  const refund = useCallback(async () => {
    const { data, error } = await supabase.rpc('refund_capture_attempt');
    if (error) {
      console.error('refund_capture_attempt failed', error.message);
      return;
    }
    if (typeof data === 'number') setRemaining(data);
  }, []);

  return {
    remaining,
    exhausted: remaining !== null && remaining <= 0,
    refresh,
    consume,
    refund,
  };
};

