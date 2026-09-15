import { useMemo, useState } from 'react';
import { Award, Gift, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useBadges, type BadgeProgress } from '@/hooks/useBadges';
import { BADGE_GROUP_ICONS, BADGE_GROUP_ORDER, getGroupLabel, type BadgeGroup } from '@/lib/badges';

interface Props {
  userId: string;
  level: number;
  regionsExplored: number;
  refreshKey?: number;
  onClaimed?: () => void;
}

type Filter = 'all' | 'claimable' | 'unlocked' | BadgeGroup;

const BadgesSection = ({ userId, level, regionsExplored, refreshKey = 0, onClaimed }: Props) => {
  const { t } = useTranslation();
  const { badges, loading, markClaimed } = useBadges(userId, level, regionsExplored, refreshKey);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const claimedCount = badges.filter((b) => b.claimed).length;
  const claimableCount = badges.filter((b) => b.earned && !b.claimed).length;

  const filtered = useMemo(() => {
    if (filter === 'all') return badges;
    if (filter === 'claimable') return badges.filter((b) => b.earned && !b.claimed);
    if (filter === 'unlocked') return badges.filter((b) => b.claimed);
    return badges.filter((b) => b.badge.group === filter);
  }, [badges, filter]);

  const sections = useMemo(() => {
    return BADGE_GROUP_ORDER.map((group) => ({
      group,
      items: filtered.filter((b) => b.badge.group === group),
    })).filter((s) => s.items.length > 0);
  }, [filtered]);

  const claimBadge = async (entry: BadgeProgress) => {
    if (claiming) return;
    const { id } = entry.badge;
    setClaiming(id);
    const { data: claimed, error } = await supabase.rpc('claim_badge', {
      p_badge_id: id,
      p_xp_reward: entry.badge.xp,
    });
    if (!error && claimed) {
      markClaimed(id);
      toast.success(t('profile.badges.claimedToast', { xp: entry.badge.xp }));
      onClaimed?.();
    }
    setClaiming(null);
  };

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: t('profile.badges.all', { count: badges.length }) },
    ...(claimableCount > 0 ? [{ key: 'claimable' as Filter, label: t('profile.badges.claimable', { count: claimableCount }) }] : []),
    { key: 'unlocked', label: t('profile.badges.unlocked', { count: claimedCount }) },
    ...BADGE_GROUP_ORDER.filter((g) => badges.some((b) => b.badge.group === g)).map((g) => ({
      key: g as Filter,
      label: `${BADGE_GROUP_ICONS[g]} ${getGroupLabel(t, g)}`,
    })),
  ];

  return (
    <div id="badges" className="scroll-mt-20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber/15 border border-amber/25 flex items-center justify-center">
            <Award className="w-4.5 h-4.5 text-amber" />
          </div>
          <h3 className="text-lg font-display font-black text-foreground">{t('profile.badges.title')}</h3>
        </div>
        <span className="text-[11px] font-display font-semibold text-amber bg-amber/10 border border-amber/20 px-2.5 py-1 rounded-full">
          🏆 {claimedCount}/{badges.length}
        </span>
      </div>

      <div className="-mx-4 px-4 mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 w-max">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold border transition-colors ${
                filter === chip.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-xs text-muted-foreground font-display">{t('profile.badges.loading')}</p>}

      {!loading && sections.length === 0 && (
        <p className="text-xs text-muted-foreground font-display">{t('profile.badges.empty')}</p>
      )}

      <div className="space-y-5">
        {sections.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[11px] font-display font-bold uppercase tracking-wide text-muted-foreground mb-2">
              {BADGE_GROUP_ICONS[group]} {getGroupLabel(t, group)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {items.map(({ badge, progress, earned, claimed }, i) => {
                const pct = Math.min(100, Math.round((progress / badge.total) * 100));
                const readyToClaim = earned && !claimed;
                return (
                  <button
                    key={badge.id}
                    disabled={!readyToClaim || claiming === badge.id}
                    onClick={() => readyToClaim && claimBadge({ badge, progress, earned, claimed })}
                    className={`relative overflow-hidden rounded-3xl px-3 pt-5 pb-3.5 text-center transition-all duration-500 game-card-appear ${
                      claimed
                        ? 'bg-card border border-amber/30 shadow-[0_10px_28px_-16px_hsla(38,92%,56%,0.45)] badge-earned-glow'
                        : readyToClaim
                        ? 'bg-card border border-primary/40 shadow-[0_10px_28px_-16px_hsla(var(--primary)/0.5)] cursor-pointer active:scale-95'
                        : 'bg-card/70 border border-border/50'
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Pastille XP / état */}
                    <span
                      className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-display font-bold ${
                        claimed
                          ? 'bg-amber/12 text-amber'
                          : readyToClaim
                          ? 'bg-primary/12 text-primary'
                          : 'bg-muted/70 text-muted-foreground'
                      }`}
                    >
                      {readyToClaim ? (
                        <>
                          <Gift className="w-2.5 h-2.5" /> +{badge.xp} XP
                        </>
                      ) : claimed ? (
                        <>✓ +{badge.xp} XP</>
                      ) : (
                        <>
                          <Lock className="w-2.5 h-2.5" /> {badge.xp} XP
                        </>
                      )}
                    </span>

                    <BadgeMedallion
                      badgeId={badge.id}
                      group={badge.group}
                      fallbackEmoji={badge.icon}
                      state={claimed ? 'claimed' : readyToClaim ? 'claimable' : 'locked'}
                      size={64}
                      className="mx-auto mb-2.5"
                    />

                    <p className={`text-[12px] font-display font-black leading-tight mb-1 ${claimed || readyToClaim ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {badge.name}
                    </p>
                    <p className="text-[9px] leading-snug mb-2.5 text-muted-foreground line-clamp-2">
                      {badge.description}
                    </p>

                    <div className="h-1 rounded-full bg-muted/80 overflow-hidden">
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
                        claimed ? 'text-amber' : readyToClaim ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {claimed
                        ? t('profile.badges.unlockedTag')
                        : readyToClaim
                        ? t('profile.badges.claimCta', { defaultValue: 'À réclamer' })
                        : `${progress}/${badge.total}`}
                    </p>
                  </button>
                );
              })}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgesSection;
