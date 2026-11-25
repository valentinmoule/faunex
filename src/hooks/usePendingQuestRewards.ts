import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeekISO } from '@/lib/weekUtils';

export const pendingRewardsKey = (uid?: string) => ['pending-quest-rewards', uid] as const;

/** Nombre de quêtes terminées mais pas encore récoltées (semaine en cours). */
export function usePendingQuestRewards() {
  const { session } = useAuth();
  const uid = session?.user?.id;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: pendingRewardsKey(uid),
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('weekly_quests').select('id', { count: 'exact', head: true })
        .eq('user_id', uid!).eq('completed', true).eq('claimed', false)
        .gte('quest_date', startOfWeekISO());
      return count ?? 0;
    },
  });
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`pending-rewards-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_quests', filter: `user_id=eq.${uid}` },
        () => qc.invalidateQueries({ queryKey: pendingRewardsKey(uid) }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid, qc]);
  return query.data ?? 0;
}
