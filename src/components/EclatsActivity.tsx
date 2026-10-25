import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { walletKey } from '@/hooks/useWallet';
import { millisecondsUntilUtcMidnight } from '@/lib/economy/activity';
import { toast } from 'sonner';

export default function EclatsActivity() {
  const { session, needsUsername } = useAuth();
  const { t } = useTranslation();
  const client = useQueryClient();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || needsUsername) return;
    let disposed = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (disposed || pending || document.visibilityState !== 'visible') return;
      pending = true;
      try {
        const { data, error } = await supabase.rpc('claim_daily_eclats');
        const reward = data as { awarded?: boolean; amount?: number } | null;
        if (!error && reward?.awarded && Number(reward.amount) > 0 && !disposed) toast.success(t('economy.gain', { amount: reward.amount }));
        if (!disposed) await client.invalidateQueries({ queryKey: walletKey(userId) });
      } finally { pending = false; }
    };
    const schedule = () => {
      timer = setTimeout(() => { void refresh(); schedule(); }, millisecondsUntilUtcMidnight());
    };
    const visible = () => { void refresh(); };
    const gains = (event: Event) => {
      const amount = Number((event as CustomEvent<{ amount: number }>).detail?.amount ?? 0);
      if (amount > 0) toast.success(t('economy.gain', { amount }));
      void client.invalidateQueries({ queryKey: walletKey(userId) });
    };
    let nativeRemove: (() => Promise<void>) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => { if (isActive) void refresh(); }).then(handle => {
        if (disposed) void handle.remove(); else nativeRemove = () => handle.remove();
      });
    }
    void refresh(); schedule();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('faunex:eclats', gains);
    return () => {
      disposed = true; clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('faunex:eclats', gains);
      if (nativeRemove) void nativeRemove();
    };
  }, [userId, needsUsername, client, t]);
  return null;
}