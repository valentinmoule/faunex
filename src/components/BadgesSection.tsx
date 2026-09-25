import { useMemo, useState } from 'react';
import XpPill from '@/components/XpPill';
import { useTranslation } from 'react-i18next';
import { useBadges, type BadgeProgress } from '@/hooks/useBadges';
import BadgeMedallion from '@/components/BadgeMedallion';
import BadgeRewardSheet from '@/components/BadgeRewardSheet';
import { BADGE_GROUP_ICONS, BADGE_GROUP_ORDER, getGroupLabel } from '@/lib/badges';

interface Props {
  userId: string;
  level: number;
  regionsExplored: number;
  refreshKey?: number;
  onClaimed?: () => void;
}

/** Ordre d'affichage : à réclamer, puis débloqués, puis en cours. */
const rank = (b: BadgeProgress) => (b.earned && !b.claimed ? 0 : b.claimed ? 1 : 2);

const BadgesSection = ({ userId, level, regionsExplored, refreshKey = 0, onClaimed }: Props) => {
  const { t } = useTranslation();
  const { badges, loading, markClaimed } = useBadges(userId, level, regionsExplored, refreshKey);
  /** Badge dont l'écran de récompense est ouvert : la récupération s'y fait. */
  const [reward, setReward] = useState<BadgeProgress | null>(null);

  /** Tous les badges, sans filtre ni compteur : ceux à réclamer en tête. */
  const ordered = useMemo(() => {
    return [...badges].sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      const byGroup = BADGE_GROUP_ORDER.indexOf(a.badge.group) - BADGE_GROUP_ORDER.indexOf(b.badge.group);
      if (byGroup !== 0) return byGroup;
      return b.progress / b.badge.total - a.progress / b.badge.total;
    });
  }, [badges]);

  return (
    <div id="badges" className="scroll-mt-20">
      <h3 className="text-lg font-display font-black text-foreground mb-5">{t('profile.badges.title')}</h3>

      {loading && <p className="text-xs text-muted-foreground font-display">{t('profile.badges.loading')}</p>}

      {!loading && ordered.length === 0 && (
        <p className="text-xs text-muted-foreground font-display">{t('profile.badges.empty')}</p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {ordered.map(({ badge, progress, earned, claimed }, i) => {
          const pct = Math.min(100, Math.round((progress / badge.total) * 100));
          const readyToClaim = earned && !claimed;
          return (
            <button
              key={badge.id}
              disabled={!readyToClaim}
              onClick={() => readyToClaim && setReward({ badge, progress, earned, claimed })}
              className={`relative flex flex-col text-center transition-transform duration-500 game-card-appear ${
                readyToClaim ? 'cursor-pointer active:scale-95' : ''
              }`}
              style={{ animationDelay: `${Math.min(i, 17) * 40}ms` }}
            >
              <div className="relative w-fit mx-auto mb-2.5">
                {/* Tag « Nouveau » sur les badges à réclamer */}
                {readyToClaim && (
                  <span className="absolute -top-2 -left-3.5 z-10 rounded-[6px] bg-destructive px-2 py-1 text-[9px] font-display font-black uppercase tracking-wide text-destructive-foreground shadow-sm">
                    {t('profile.badges.newTag')}
                  </span>
                )}

                {!claimed && (
                  <XpPill
                    xp={badge.xp}
                    state={readyToClaim ? 'ready' : 'locked'}
                    className="absolute -top-1 -right-2"
                  />
                )}

                <BadgeMedallion
                  badgeId={badge.id}
                  group={badge.group}
                  fallbackEmoji={badge.icon}
                  state={claimed ? 'claimed' : readyToClaim ? 'claimable' : 'locked'}
                  size={96}
                />
              </div>

              <p className="text-[9px] font-display font-bold uppercase tracking-wide text-muted-foreground/70 mb-0.5">
                {BADGE_GROUP_ICONS[badge.group]} {getGroupLabel(t, badge.group)}
              </p>
              <p className={`text-[12px] font-display font-black leading-tight mb-1 ${claimed || readyToClaim ? 'text-foreground' : 'text-muted-foreground'}`}>
                {badge.name}
              </p>
              <p className="text-[9px] leading-snug mb-2.5 text-muted-foreground line-clamp-2">
                {badge.description}
              </p>

              <div className="mt-auto h-1 rounded-full bg-muted/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    claimed
                      ? 'bg-gradient-to-r from-amber to-amber-light'
                      : 'bg-gradient-to-r from-primary/60 to-primary'
                  }`}
                  style={{ width: `${claimed ? 100 : pct}%` }}
                />
              </div>
              <p
                className={`mt-1.5 text-[9px] font-display font-bold uppercase tracking-wide ${
                  claimed ? 'text-amber' : 'text-muted-foreground'
                }`}
              >
                {claimed ? t('profile.badges.unlockedTag') : `${progress}/${badge.total}`}
              </p>
            </button>
          );
        })}
      </div>

      {/* Écran de récompense : illustration en grand + récupération */}
      {reward && (
        <BadgeRewardSheet
          entry={reward}
          onClose={() => setReward(null)}
          onClaimed={(entry) => {
            markClaimed(entry.badge.id);
            onClaimed?.();
          }}
        />
      )}
    </div>
  );
};

export default BadgesSection;
