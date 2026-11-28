import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const DAILY_CAPTURE_LIMIT = 4;
export const captureQuotaKey = (userId?: string) => ['capture-quota', userId] as const;
type QuotaStatus = { remaining: number; reason: string; retryAt: string | null };

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
  const queryClient = useQueryClient();
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const readStatus = useCallback(async (): Promise<QuotaStatus> => {
    if (!userId) throw new Error('No account');
    const { data, error } = await supabase.rpc('get_ai_analysis_status');
    if (error) throw error;
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.remaining !== 'number') throw new Error('Invalid quota status');
    return { remaining: data.remaining, reason: typeof data.reason === 'string' ? data.reason : 'available', retryAt: typeof data.retry_at === 'string' ? data.retry_at : null };
  }, [userId]);
  const { data } = useQuery({ queryKey: captureQuotaKey(userId), queryFn: readStatus, enabled: !!userId, staleTime: 30_000 });
  const remaining = data?.remaining ?? null;
  const reason = data?.reason ?? 'available';
  const retryAt = data?.retryAt ?? null;

  /** Relit le quota et renvoie la valeur fraîche (null si indisponible). */
  const fetchRemaining = useCallback(async () => {
    if (!userId) return null;
    try {
      const status = await queryClient.fetchQuery({ queryKey: captureQuotaKey(userId), queryFn: readStatus, staleTime: 0 });
      return currentUser.current === userId ? status.remaining : null;
    } catch { return null; }
  }, [userId, queryClient, readStatus]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await fetchRemaining();
  }, [userId, fetchRemaining]);

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




