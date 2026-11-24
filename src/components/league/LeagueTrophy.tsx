import { useId } from 'react';

/**
 * Trophée illustré d'un palier de ligue (0 Débutant → 6 Élite).
 * Teintes définies par les tokens --league-{tier}-{hi|mid|lo|gem} de index.css.
 */
interface Props { tier: number; size?: number; locked?: boolean; className?: string }

export default function LeagueTrophy({ tier, size = 64, locked = false, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const t = Math.max(0, Math.min(6, tier));
  const c = (k: string) => (locked ? `hsl(var(--league-locked-${k}))` : `hsl(var(--league-${t}-${k}))`);
  const metal = `m${uid}`, shine = `s${uid}`, gem = `g${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c('hi')} />
          <stop offset="0.55" stopColor={c('mid')} />
          <stop offset="1" stopColor={c('lo')} />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--background))" stopOpacity="0.75" />
          <stop offset="1" stopColor="hsl(var(--background))" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={gem} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="hsl(var(--background))" />
          <stop offset="0.35" stopColor={c('gem')} />
          <stop offset="1" stopColor={c('lo')} />
        </radialGradient>
      </defs>
      {/* Ombre au sol */}
      <ellipse cx="32" cy="60" rx="17" ry="2.6" fill="hsl(var(--foreground))" opacity="0.12" />
      {/* Socle */}
      <path d="M18 51h28l2.5 7h-33z" fill={c('lo')} />
      <rect x="20" y="47" width="24" height="5" rx="1.5" fill={`url(#${metal})`} />
      <rect x="28" y="38" width="8" height="10" fill={c('lo')} />
      {/* Anses */}
      <path d="M15 12c-7 0-8 13 3 17" stroke={c('lo')} strokeWidth="3.6" fill="none" strokeLinecap="round" />
      <path d="M49 12c7 0 8 13-3 17" stroke={c('lo')} strokeWidth="3.6" fill="none" strokeLinecap="round" />
      {/* Coupe */}
      <path d="M13 8h38v8c0 13-8.5 23-19 23S13 29 13 16z" fill={`url(#${metal})`} stroke={c('lo')} strokeWidth="1.4" />
      <path d="M17 10h11c-1.5 9 0 17 4 24-8-2-15-10-15-18z" fill={`url(#${shine})`} />
      <rect x="12" y="6" width="40" height="4" rx="2" fill={c('hi')} stroke={c('lo')} strokeWidth="1" />
      {/* Emblème du palier */}
      {t === 0 ? (
        <path d="M32 31v-9m0 3c-4 0-7-3-7-7 4 0 7 3 7 7zm0-2c0-4 3-7 7-7 0 4-3 7-7 7z" fill={c('gem')} stroke={c('lo')} strokeWidth="1.3" strokeLinejoin="round" />
      ) : t >= 4 ? (
        <path d={t === 6 ? 'M23 27l2-9 4 4 3-6 3 6 4-4 2 9z' : 'M32 14l7 7-7 9-7-9z'} fill={`url(#${gem})`} stroke={c('lo')} strokeWidth="1.2" strokeLinejoin="round" />
      ) : (
        <>
          <circle cx="32" cy="21" r="6.5" fill={c('lo')} opacity="0.35" />
          <text x="32" y="25" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Sora, sans-serif" fill={c('hi')}>{t}</text>
        </>
      )}
      {t === 6 && !locked && (
        <g fill={c('hi')}><path d="M8 4l1 2.5L11.5 7.5 9 8.5 8 11 7 8.5 4.5 7.5 7 6.5z" /><path d="M56 30l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></g>
      )}
      {locked && (
        <g>
          <circle cx="47" cy="49" r="8" fill="hsl(var(--background))" />
          <rect x="42.5" y="47" width="9" height="7" rx="1.6" fill="hsl(var(--muted-foreground))" />
          <path d="M44.5 47v-2a2.5 2.5 0 0 1 5 0v2" stroke="hsl(var(--muted-foreground))" strokeWidth="1.8" fill="none" />
        </g>
      )}
    </svg>
  );
}
