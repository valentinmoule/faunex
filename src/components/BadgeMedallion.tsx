import { Award } from 'lucide-react';
import { getBadgeArt } from '@/lib/badgeArt';
import type { BadgeGroup } from '@/lib/badges';

export type BadgeMedallionState = 'locked' | 'claimable' | 'claimed';

/** Teinte d'ambiance par famille, utilisée par l'écran de récompense. */
export const GROUP_HUE: Record<BadgeGroup, { from: string; to: string }> = {
  progression: { from: '--primary', to: '--rarity-uncommon' },
  especes: { from: '--accent', to: '--primary' },
  rarete: { from: '--rarity-rare', to: '--rarity-very-rare' },
  collections: { from: '--rarity-very-rare', to: '--sky' },
  classement: { from: '--amber', to: '--amber-dark' },
  social: { from: '--sky', to: '--rarity-rare' },
};

interface Props {
  badgeId: string;
  group: BadgeGroup;
  fallbackEmoji?: string;
  state: BadgeMedallionState;
  size?: number;
  className?: string;
}

/** Illustration d'écusson émaillé propre à chaque distinction. */
const BadgeMedallion = ({ badgeId, group, fallbackEmoji, state, size = 88, className = '' }: Props) => {
  const art = getBadgeArt(badgeId);
  const hue = GROUP_HUE[group];
  const locked = state === 'locked';
  const claimable = state === 'claimable';

  return (
    <div
      className={`relative shrink-0 ${className} ${state === 'claimed' ? 'badge-icon-float' : ''}`}
      style={{ width: size, height: size }}
    >
      {claimable && (
        <span
          aria-hidden
          className="absolute inset-[10%] animate-pulse rounded-full blur-xl"
          style={{ background: `hsl(var(${hue.from}) / 0.42)` }}
        />
      )}

      {art ? (
        <img
          src={art}
          alt=""
          aria-hidden
          loading="lazy"
          width={768}
          height={768}
          className={`relative size-full object-contain transition-[filter,opacity] duration-300 ${
            locked
              ? 'grayscale opacity-30 contrast-75'
              : 'drop-shadow-[0_6px_8px_hsl(var(--foreground)/0.16)]'
          }`}
        />
      ) : (
        <span className="relative flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground">
          {fallbackEmoji ? <span style={{ fontSize: size * 0.38 }}>{fallbackEmoji}</span> : <Award className="size-1/2" />}
        </span>
      )}
    </div>
  );
};

export default BadgeMedallion;
