import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { parseWallet } from '@/lib/economy/activity';

export const walletKey = (userId?: string) => ['eclats-wallet', userId];
export function useWallet() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({ queryKey: walletKey(userId), enabled: Boolean(userId), queryFn: async () => {
    const { data, error } = await supabase.rpc('my_eclats_wallet');
    if (error) throw error;
    return parseWallet(data);
  } });
}