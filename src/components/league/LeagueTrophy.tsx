import trophy0 from '@/assets/league/trophy-0.webp';
import trophy1 from '@/assets/league/trophy-1.webp';
import trophy2 from '@/assets/league/trophy-2.webp';
import trophy3 from '@/assets/league/trophy-3.webp';
import trophy4 from '@/assets/league/trophy-4.webp';
import trophy5 from '@/assets/league/trophy-5.webp';
import trophy6 from '@/assets/league/trophy-6.webp';

const TROPHIES = [trophy0, trophy1, trophy2, trophy3, trophy4, trophy5, trophy6];

/** Trophée illustré d'un palier de ligue (0 Débutant → 6 Élite), dans la facture de la mascotte. */
interface Props { tier: number; size?: number; locked?: boolean; className?: string }

export default function LeagueTrophy({ tier, size = 64, locked = false, className = '' }: Props) {
  const t = Math.max(0, Math.min(6, tier));
  return (
    <img
      src={TROPHIES[t]}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size }}
      className={`object-contain ${locked ? 'grayscale opacity-40 contrast-75' : 'drop-shadow-[0_6px_8px_hsl(var(--foreground)/0.16)]'} ${className}`}
    />
  );
}
