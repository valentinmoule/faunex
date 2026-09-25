import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useBadges, type BadgeProgress } from '@/hooks/useBadges';
import BadgeMedallion from '@/components/BadgeMedallion';
import BadgeRewardSheet from '@/components/BadgeRewardSheet';

interface Props {
  userId: string;
  level: number;
  regionsExplored: number;
  onOpenAll: () => void;
  onClaimed?: () => void;
}

/** Ligne « Badges » de la modale profil : badges à récupérer d'abord, puis les 4 derniers récupérés. */
const ProfileBadgesRow = ({ userId, level, regionsExplored, onOpenAll, onClaimed }: Props) => {
  const { t } = useTranslation();
  const { badges, markClaimed } = useBadges(userId, level, regionsExplored);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  /** Badge dont l'écran de récompense est ouvert. */
  const [reward, setReward] = useState<BadgeProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId)
      .order('claimed_at', { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (!cancelled) setRecentIds((data ?? []).map((r) => r.badge_id));
      });
    return () => { cancelled = true; };
  }, [userId]);

  const items = useMemo(() => {
    const byId = new Map(badges.map((b) => [b.badge.id, b]));
    const claimable = badges.filter((b) => b.earned && !b.claimed);
    const recent = recentIds.map((id) => byId.get(id)).filter((b): b is BadgeProgress => Boolean(b));
    const seen = new Set<string>();
    return [...claimable, ...recent].filter((b) => !seen.has(b.badge.id) && seen.add(b.badge.id)).slice(0, 4);
  }, [badges, recentIds]);

  /** Réclamation effectuée depuis l'écran de récompense : on rafraîchit la ligne. */
  const handleClaimed = (entry: BadgeProgress) => {
    markClaimed(entry.badge.id);
    setRecentIds((ids) => [entry.badge.id, ...ids.filter((id) => id !== entry.badge.id)].slice(0, 4));
    onClaimed?.();
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onOpenAll}
        aria-label={t('profile.page.drawer.badgesSeeAll')}
        className="flex w-full items-center justify-between pt-1 text-left"
      >
        <span className="text-xs font-display font-bold text-foreground">{t('profile.page.drawer.badgesTitle')}</span>
        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
          {t('profile.page.drawer.badgesSeeAll')}
          <ChevronRight className="size-3.5" />
        </span>
      </button>
      <div className="flex items-center gap-3 pb-1 pt-3">
        {items.length === 0 ? (
          <button type="button" onClick={onOpenAll} className="w-full py-2 text-left text-xs text-muted-foreground">
            {t('profile.page.drawer.badgesEmpty')}
          </button>
        ) : (
          items.map((entry) => {
            const ready = entry.earned && !entry.claimed;
            return (
              <button
                key={entry.badge.id}
                type="button"
                onClick={() => (ready ? setReward(entry) : onOpenAll())}
                aria-label={ready ? t('profile.page.drawer.badgeClaim', { name: entry.badge.name }) : entry.badge.name}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 transition-transform active:scale-95"
              >
                <span className="relative">
                  <BadgeMedallion
                    badgeId={entry.badge.id}
                    group={entry.badge.group}
                    fallbackEmoji={entry.badge.icon}
                    state={ready ? 'claimable' : 'claimed'}
                    size={48}
                  />
                  {ready && (
                    <span className="absolute -top-1.5 -left-2 z-10 rounded-[5px] bg-destructive px-1.5 py-0.5 text-[8px] font-display font-black uppercase tracking-wide text-destructive-foreground shadow-sm">
                      {t('profile.page.drawer.newTag')}
                    </span>
                  )}
                </span>
                <span className={`w-full truncate text-center text-[9px] ${ready ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                  {entry.badge.name}
                </span>

              </button>
            );
          })
        )}
      </div>

      {reward && (
        <BadgeRewardSheet entry={reward} onClose={() => setReward(null)} onClaimed={handleClaimed} />
      )}
    </div>
  );
};

export default ProfileBadgesRow;
