import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const DAILY_CAPTURE_LIMIT = 4;

/**
 * Quota quotidien d'identifications.
 *
 * Source de vérité UNIQUE : `ai_analysis_attempts`, la table réellement
 * débitée par la fonction d'identification. Auparavant l'écran affichait un
 * second compteur (`capture_attempts`, débité seulement à l'enregistrement) :
 * un explorateur qui analysait 4 photos mais n'en gardait que 3 voyait
 * « 1/4 » tout en étant bloqué par le serveur.
 */
export const useCaptureQuota = (userId?: string) => {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [reason, setReason] = useState('available');
  const [retryAt, setRetryAt] = useState<string | null>(null);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  /** Relit le quota et renvoie la valeur fraîche (null si indisponible). */
  const fetchRemaining = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('get_ai_analysis_status');
    if (currentUser.current !== userId) return null;
    if (!error && data && typeof data === 'object' && !Array.isArray(data) && typeof data.remaining === 'number') {
      setRemaining(data.remaining);
      setReason(typeof data.reason === 'string' ? data.reason : 'available');
      setRetryAt(typeof data.retry_at === 'string' ? data.retry_at : null);
      return data.remaining;
    }
    return null;
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await fetchRemaining();
  }, [userId, fetchRemaining]);

  useEffect(() => {
    setRemaining(null);
    setReason('available');
    setRetryAt(null);
    void refresh();
  }, [refresh]);

  // Relire à l'heure exacte du déblocage, même si la caméra est restée ouverte.
  useEffect(() => {
    if (!retryAt) return;
    const delay = Date.parse(retryAt) - Date.now();
    if (!Number.isFinite(delay)) return;
    const timer = window.setTimeout(() => { void refresh(); }, Math.max(0, delay) + 250);
    return () => window.clearTimeout(timer);
  }, [retryAt, refresh]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onFocus = () => { void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  /**
   * L'analyse IA a déjà débité le slot côté serveur : enregistrer la capture ne
   * coûte donc plus rien et ne doit jamais être refusée ici.
   */
  const consume = useCallback(async () => {
    void refresh();
    return true;
  }, [refresh]);

  /** Rien à rendre : le remboursement éventuel est géré côté serveur. */
  const refund = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    remaining,
    reason,
    retryAt,
    unlimited: remaining !== null && remaining > DAILY_CAPTURE_LIMIT,
    exhausted: remaining !== null && remaining <= 0,
    refresh,
    fetchRemaining,
    consume,
    refund,
  };
};




