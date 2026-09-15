import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Récompenses XP des collections/territoires terminés.
 *
 * On réutilise le mécanisme des badges (`claim_badge`) : l'identifiant est le
 * même que celui du badge de collection (`collection_<clé>`), donc une
 * récompense réclamée ici n'est jamais donnée deux fois côté badges.
 */
export const COLLECTION_REWARD_PREFIX = 'collection_';
export const ZONE_REWARD_PREFIX = 'zone_';

/** XP gagnés en complétant une collection, proportionnels à sa taille. */
export const collectionRewardXp = (total: number) => Math.min(1000, 100 + total * 20);

export const useCollectionRewards = (userId?: string) => {
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setClaimedIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);
      if (cancelled) return;
      setClaimedIds(
        (data || [])
          .map((row: { badge_id: string }) => row.badge_id)
          .filter((id) => id.startsWith(COLLECTION_REWARD_PREFIX) || id.startsWith(ZONE_REWARD_PREFIX)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isClaimed = useCallback((rewardId: string) => claimedIds.includes(rewardId), [claimedIds]);

  /** Réclame la récompense ; renvoie les XP réellement gagnés (0 si déjà réclamée). */
  const claimReward = useCallback(
    async (rewardId: string, xp: number): Promise<number> => {
      if (!userId || claiming || claimedIds.includes(rewardId)) return 0;
      setClaiming(rewardId);
      const { data, error } = await supabase.rpc('claim_badge', {
        p_badge_id: rewardId,
        p_xp_reward: xp,
      });
      setClaiming(null);
      if (error || !data) return 0;
      setClaimedIds((prev) => (prev.includes(rewardId) ? prev : [...prev, rewardId]));
      return xp;
    },
    [claimedIds, claiming, userId],
  );

  return { isClaimed, claimReward, claiming };
};
