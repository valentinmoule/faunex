import { useCallback, useEffect, useState } from 'react';
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

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc('ai_analyses_remaining_today');
    if (!error && typeof data === 'number') setRemaining(data);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * L'analyse IA a déjà débité le slot côté serveur : enregistrer la capture ne
   * coûte donc plus rien. On resynchronise simplement l'affichage.
   */
  const consume = useCallback(async () => {
    const { data, error } = await supabase.rpc('ai_analyses_remaining_today');
    if (!error && typeof data === 'number') {
      setRemaining(data);
      return data > 0;
    }
    return true;
  }, []);

  /** Rien à rendre : le remboursement éventuel est géré côté serveur. */
  const refund = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    remaining,
    exhausted: remaining !== null && remaining <= 0,
    refresh,
    consume,
    refund,
  };
};


