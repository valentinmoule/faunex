import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Infinity as InfinityIcon, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CategoryLeaderboard from '@/components/CategoryLeaderboard';
import { Chip as RoundChip, categoryChipImage } from '@/components/CategoryChipRow';
import LeaderboardFollowsEmptyState from '@/components/social/LeaderboardFollowsEmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const LEADERBOARD_CATEGORIES = ['Mammifères', 'Oiseaux', 'Insectes', 'Poissons', 'Reptiles', 'Amphibiens', 'Arachnides', 'Mollusques', 'Crustacés'];

/** Classement affiché directement dans Explorateurs (sans changer de page). */
export default function ExplorersLeaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isPremium, loading: premiumLoading } = useSubscription(session?.user?.id);
  const [mode, setMode] = useState<'league' | 'honors'>('league');
  const [filter, setFilter] = useState<'follows' | 'all' | string>('all');
  const scope: 'global' | 'explorers' = mode === 'honors' && filter === 'follows' ? 'explorers' : 'global';
  // Combien d'explorateurs je suis : détermine l'état vide du classement « Abonnements ».
  const userId = session?.user?.id;
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setFollowingCount(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('explorer_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)
      .eq('status', 'accepted')
      .then(({ count }) => {
        if (!cancelled) setFollowingCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="px-4">
      <div role="tablist" className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(['league', 'honors'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`h-9 rounded-full text-[13px] font-display font-bold transition-colors ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t(m === 'league' ? 'social.leaderboard.modeLeague' : 'social.leaderboard.modeHonors')}
          </button>
        ))}
      </div>
      {mode === 'honors' && (
      <div role="radiogroup" aria-label={t('social.leaderboard.ranking')} className="no-scrollbar -mx-3 mb-1 mt-2 flex gap-1 overflow-x-auto px-3 pt-1 pb-0.5">
        <RoundChip selected={filter === 'follows'} label={t('social.leaderboard.chipFollowing')} onClick={() => setFilter('follows')}>
          <span className="relative flex h-full w-full items-center justify-center bg-chip-all">
            <Users className="h-7 w-7 text-foreground" strokeWidth={2.25} />
            {!isPremium && <Lock className="absolute bottom-2 right-2 h-3.5 w-3.5 text-muted-foreground" />}
          </span>
        </RoundChip>
        <RoundChip selected={filter === 'all'} label={t('social.leaderboard.tabAllTime')} onClick={() => setFilter('all')}>
          <span className="flex h-full w-full items-center justify-center bg-chip-all"><InfinityIcon className="h-7 w-7 text-foreground" strokeWidth={2.25} /></span>
        </RoundChip>
        {LEADERBOARD_CATEGORIES.map((category) => (
          <RoundChip key={category} selected={filter === category} label={t(`bestiary.categoryNames.${category}`, { defaultValue: category })} onClick={() => setFilter(category)}>
            <img src={categoryChipImage(category)} alt="" width={64} height={64} decoding="async" className="h-full w-full object-cover" />
          </RoundChip>
        ))}
      </div>
      )}
      {scope === 'explorers' && (premiumLoading || !isPremium) ? (
        premiumLoading ? (
          <p className="px-5 py-10 text-center text-[13px] font-display text-muted-foreground">{t('social.common.loading')}</p>
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-b from-amber/25 to-amber/5 border border-amber/30 flex items-center justify-center mb-3">
              <Crown className="w-6 h-6 text-amber" />
            </div>
            <p className="text-[14px] font-display font-bold text-foreground">{t('social.leaderboard.lockedTitle')}</p>
            <p className="mt-1 text-[12px] font-display text-muted-foreground leading-relaxed">{t('social.leaderboard.lockedDesc')}</p>
            <Button onClick={() => navigate('/premium')} className="h-12 w-full max-w-xs text-sm">{t('social.leaderboard.lockedCta')}</Button>
          </div>
        )
      ) : scope === 'explorers' && followingCount === 0 ? (
        <LeaderboardFollowsEmptyState />
      ) : (
        <>
          {mode === 'honors' && (
            <div className="flex h-[34px] items-center px-1 pt-1">
              <h2 className="min-w-0 truncate text-[15px] font-display font-bold text-foreground">
                {filter === 'follows' ? t('social.leaderboard.titleFollows') : filter === 'all' ? t('social.leaderboard.titleAllTime') : t(`bestiary.categoryNames.${filter}`, { defaultValue: filter })}
              </h2>
            </div>
          )}
          <CategoryLeaderboard
            key={`${mode}-${filter}`}
            category={mode === 'league' || filter === 'follows' || filter === 'all' ? 'all' : filter}
            inline
            period={mode === 'league' ? 'week' : 'all'}
            scope={scope === 'explorers' ? 'follows' : 'global'}
            showResetBadge={false}
            metric={mode === 'league' ? 'league' : filter === 'follows' || filter === 'all' ? 'xp' : 'captures'}
          />
        </>
      )}
    </section>
  );
}
