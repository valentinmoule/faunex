import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { XP_CHANGED } from '@/lib/xpEvents';

export const headerProfileKey = (userId?: string) => ['header-profile', userId] as const;
export const unreadNotificationsKey = (userId?: string) => ['unread-notifications', userId] as const;

export function useHeaderProfile(userId?: string) {
  return useQuery({
    queryKey: headerProfileKey(userId), enabled: !!userId, staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles')
        .select('display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored')
        .eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUnreadNotifications(userId?: string) {
  const query = useQuery({
    queryKey: unreadNotificationsKey(userId), enabled: !!userId, staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('read', false);
      if (error) throw error;
      return count ?? 0;
    },
  });
  return query.data ?? 0;
}

/** Mounted once in the signed-in shell, not once per header or route. */
export function useHeaderSync(userId?: string) {
  const queryClient = useQueryClient();
  useHeaderProfile(userId);
  useUnreadNotifications(userId);
  useEffect(() => {
    if (!userId) return;
    const refreshProfile = () => { void queryClient.invalidateQueries({ queryKey: headerProfileKey(userId) }); };
    const refreshNotifications = () => { void queryClient.invalidateQueries({ queryKey: unreadNotificationsKey(userId) }); };
    const refreshAll = () => { refreshProfile(); refreshNotifications(); };
    const onVisible = () => { if (document.visibilityState === 'visible') refreshAll(); };
    const channel = supabase.channel(`header-sync-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, refreshNotifications)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` }, refreshProfile)
      .subscribe();
    window.addEventListener(XP_CHANGED, refreshProfile);
    window.addEventListener('focus', refreshAll);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener(XP_CHANGED, refreshProfile);
      window.removeEventListener('focus', refreshAll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, queryClient]);
}