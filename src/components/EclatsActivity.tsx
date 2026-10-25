import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { walletKey } from '@/hooks/useWallet';
import { toast } from 'sonner';

export default function EclatsActivity() {
  const { session, needsUsername } = useAuth();
  const { t } = useTranslation();
  const client = useQueryClient();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || needsUsername) return;
    let disposed = false;
    const refresh = async () => {
      if (!disposed) await client.invalidateQueries({ queryKey: walletKey(userId) });
    };
    const visible = () => { void refresh(); };
    const gains = (event: Event) => {
      const amount = Number((event as CustomEvent<{ amount: number }>).detail?.amount ?? 0);
      if (amount > 0) toast.success(t('economy.gain', { amount }));
      void client.invalidateQueries({ queryKey: walletKey(userId) });
    };
    void refresh();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('faunex:eclats', gains);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('faunex:eclats', gains);
    };
  }, [userId, needsUsername, client, t]);
  return null;
}