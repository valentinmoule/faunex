import { useMemo, useState } from 'react';
import { Award, Gift, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBadges, type BadgeProgress } from '@/hooks/useBadges';
import { BADGE_GROUP_LABELS, BADGE_GROUP_ORDER, type BadgeGroup } from '@/lib/badges';

interface Props {
  userId: string;
  level: number;
  regionsExplored: number;
  refreshKey?: number;
  onClaimed?: () => void;
}

type Filter = 'all' | 'claimable' | 'unlocked' | BadgeGroup;

const BadgesSection = ({ userId, level, regionsExplored, refreshKey = 0, onClaimed }: Props) => {
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
      toast.success(`Badge débloqué ! +${entry.badge.xp} XP 🎉`);
      onClaimed?.();
    }
    setClaiming(null);
  };

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: `Tous · ${badges.length}` },
    ...(claimableCount > 0 ? [{ key: 'claimable' as Filter, label: `À réclamer · ${claimableCount}` }] : []),
    { key: 'unlocked', label: `Débloqués · ${claimedCount}` },
    ...BADGE_GROUP_ORDER.filter((g) => badges.some((b) => b.badge.group === g)).map((g) => ({
      key: g as Filter,
      label: `${BADGE_GROUP_LABELS[g].icon} ${BADGE_GROUP_LABELS[g].label}`,
    })),
  ];

  return (
    <div id="badges" className="scroll-mt-20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber/15 border border-amber/25 flex items-center justify-center">
            <Award className="w-4.5 h-4.5 text-amber" />
          </div>
          <h3 className="text-lg font-display font-black text-foreground">Badges</h3>
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

      {loading && <p className="text-xs text-muted-foreground font-display">Chargement des badges…</p>}

      {!loading && sections.length === 0 && (
        <p className="text-xs text-muted-foreground font-display">Aucun badge dans cette sélection.</p>
      )}

      <div className="space-y-5">
        {sections.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[11px] font-display font-bold uppercase tracking-wide text-muted-foreground mb-2">
              {BADGE_GROUP_LABELS[group].icon} {BADGE_GROUP_LABELS[group].label}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {items.map(({ badge, progress, earned, claimed }, i) => {
                const pct = Math.round((progress / badge.total) * 100);
                const readyToClaim = earned && !claimed;
                return (
                  <button
                    key={badge.id}
                    disabled={!readyToClaim || claiming === badge.id}
                    onClick={() => readyToClaim && claimBadge({ badge, progress, earned, claimed })}
                    className={`relative rounded-2xl p-3.5 text-center transition-all duration-500 game-card-appear ${
                      claimed
                        ? 'bg-gradient-to-b from-amber/10 via-amber/5 to-card border-2 border-amber/40 shadow-[0_0_20px_hsla(42,85%,55%,0.15)] badge-earned-glow'
                        : readyToClaim
                        ? 'bg-gradient-to-b from-primary/10 via-primary/5 to-card border-2 border-primary/50 shadow-[0_0_20px_hsla(var(--primary)/0.2)] animate-pulse cursor-pointer active:scale-95'
                        : 'bg-card/80 border border-border/60 hover:border-border'
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {claimed && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber flex items-center justify-center shadow-[0_0_8px_hsla(42,85%,55%,0.5)] badge-sparkle">
                        <span className="text-[8px]">✓</span>
                      </div>
                    )}
                    {readyToClaim && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_10px_hsla(var(--primary)/0.5)]">
                        <Gift className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    {!earned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <div
                      className={`relative mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all ${
                        claimed
                          ? 'bg-amber/15 border border-amber/30 shadow-[0_0_12px_hsla(42,85%,55%,0.2)]'
                          : readyToClaim
                          ? 'bg-primary/15 border border-primary/30 shadow-[0_0_12px_hsla(var(--primary)/0.2)]'
                          : 'bg-muted/60 border border-border/40'
                      }`}
                    >
                      <span className={`text-2xl ${claimed ? 'badge-icon-float' : readyToClaim ? '' : 'grayscale opacity-40'}`}>
                        {badge.icon}
                      </span>
                    </div>
                    <p className={`text-[11px] font-display font-black leading-tight mb-0.5 ${claimed || readyToClaim ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {badge.name}
                    </p>
                    <p className="text-[9px] leading-tight mb-2 text-muted-foreground">{badge.description}</p>
                    {!earned && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-muted/80 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-display font-bold text-muted-foreground">
                          {progress}/{badge.total}
                        </p>
                      </div>
                    )}
                    {readyToClaim && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-display font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <Gift className="w-2.5 h-2.5" /> +{badge.xp} XP
                      </span>
                    )}
                    {claimed && (
                      <span className="inline-block text-[9px] font-display font-bold text-amber bg-amber/10 px-2 py-0.5 rounded-full">
                        Débloqué ✨
                      </span>
                    )}
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
