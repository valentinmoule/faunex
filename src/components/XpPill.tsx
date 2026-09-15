import { Check, Gift, Lock } from 'lucide-react';

interface XpPillProps {
  xp: number;
  /** ready = à réclamer (primaire) · claimed = obtenu (ambre + check) · locked = verrouillé · reward = récompense affichée (ambre) */
  state?: 'ready' | 'claimed' | 'locked' | 'reward';
  className?: string;
}

const VARIANTS = {
  reward: 'border-amber/25 bg-amber/10 text-amber',
  claimed: 'border-amber/25 bg-amber/10 text-amber',
  ready: 'border-primary/25 bg-primary/10 text-primary',
  locked: 'border-border bg-muted/70 text-muted-foreground',
} as const;

/** Pastille XP unique partagée entre les badges et les quêtes. */
const XpPill = ({ xp, state = 'reward', className = '' }: XpPillProps) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-display font-black tabular-nums ${VARIANTS[state]} ${className}`}
  >
    {state === 'ready' && <Gift className="h-2.5 w-2.5" />}
    {state === 'claimed' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
    {state === 'locked' && <Lock className="h-2.5 w-2.5" />}
    {state === 'claimed' ? `+${xp} XP` : state === 'locked' ? `${xp} XP` : `+${xp} XP`}
  </span>
);

export default XpPill;
