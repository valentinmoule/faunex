import { Sparkles, Medal, Award, Trophy, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MILESTONE_RANKS = [1, 10, 25, 50, 100] as const;
export type MilestoneRank = (typeof MILESTONE_RANKS)[number];

export const isMilestoneRank = (rank: number | undefined): rank is MilestoneRank =>
  typeof rank === 'number' && (MILESTONE_RANKS as readonly number[]).includes(rank);

const CONFIG: Record<MilestoneRank, { Icon: typeof Medal; from: string; to: string; ring: string; text: string }> = {
  1: { Icon: Sparkles, from: 'from-primary/20', to: 'to-primary/5', ring: 'ring-primary/25', text: 'text-primary' },
  10: { Icon: Medal, from: 'from-sky-500/20', to: 'to-sky-500/5', ring: 'ring-sky-500/25', text: 'text-sky-600' },
  25: { Icon: Award, from: 'from-violet-500/20', to: 'to-violet-500/5', ring: 'ring-violet-500/25', text: 'text-violet-600' },
  50: { Icon: Trophy, from: 'from-amber-500/20', to: 'to-amber-500/5', ring: 'ring-amber-500/25', text: 'text-amber-600' },
  100: { Icon: Crown, from: 'from-rose-500/20', to: 'to-rose-500/5', ring: 'ring-rose-500/25', text: 'text-rose-600' },
};

/** Petite carte "jalon" à la Strava affichée au-dessus d'une capture marquante. */
const CaptureMilestoneCard = ({ rank, userName }: { rank: MilestoneRank; userName: string }) => {
  const { t } = useTranslation();
  const { Icon, from, to, ring, text } = CONFIG[rank];

  return (
    <div
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r ${from} ${to} px-3 py-2.5 ring-1 ${ring}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm ${text}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`line-clamp-2 font-display text-xs font-bold leading-snug ${text}`}>
          {t(`social.explorers.milestone.message_${rank}`, { name: userName })}
        </p>
        <p className="truncate font-body text-[11px] text-muted-foreground">
          {t('social.explorers.milestone.subtitle')}
        </p>
      </div>
    </div>
  );
};

export default CaptureMilestoneCard;
