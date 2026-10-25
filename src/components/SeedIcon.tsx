import { useId } from 'react';

/**
 * Icône de la monnaie du jeu : une graine qui germe, en volume.
 * Dégradé ambre, reflet et petite pousse verte — uniquement des jetons de thème.
 */
export default function SeedIcon({ className = '', glow = false }: { className?: string; glow?: boolean }) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, '');
  const body = `seed-body-${uid}`;
  const shade = `seed-shade-${uid}`;
  const leaf = `seed-leaf-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className={className}
      style={{ filter: glow ? 'drop-shadow(0 2px 3px hsl(var(--amber-dark) / .45))' : 'drop-shadow(0 1px 1px hsl(var(--amber-dark) / .35))' }}
    >
      <defs>
        <radialGradient id={body} cx="34%" cy="26%" r="86%">
          <stop offset="0%" stopColor="hsl(var(--amber-light))" />
          <stop offset="52%" stopColor="hsl(var(--amber))" />
          <stop offset="100%" stopColor="hsl(var(--amber-dark))" />
        </radialGradient>
        <radialGradient id={shade} cx="70%" cy="82%" r="62%">
          <stop offset="0%" stopColor="hsl(var(--amber-dark) / .55)" />
          <stop offset="70%" stopColor="hsl(var(--amber-dark) / 0)" />
        </radialGradient>
        <linearGradient id={leaf} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--forest-light))" />
        </linearGradient>
      </defs>

      {/* Pousse : tige et feuille */}
      <path d="M12 5.4 C 11.7 4.1, 12.2 2.9, 13.2 2.0" fill="none" stroke="hsl(var(--forest-dark))" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M13.1 2.2 C 14.4 0.9, 16.5 1.0, 17.4 2.0 C 16.4 3.4, 14.3 3.7, 13.1 2.2 Z"
        fill={`url(#${leaf})`}
        stroke="hsl(var(--forest-dark))"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Corps de la graine */}
      <path
        d="M12 5.0 C 15.6 7.6, 18.4 11.2, 18.4 14.4 A 6.4 6.4 0 0 1 5.6 14.4 C 5.6 11.2, 8.4 7.6, 12 5.0 Z"
        fill={`url(#${body})`}
        stroke="hsl(var(--amber-dark))"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M12 5.0 C 15.6 7.6, 18.4 11.2, 18.4 14.4 A 6.4 6.4 0 0 1 5.6 14.4 C 5.6 11.2, 8.4 7.6, 12 5.0 Z"
        fill={`url(#${shade})`}
      />

      {/* Reflets */}
      <ellipse cx="9.1" cy="11.1" rx="2.2" ry="3.3" transform="rotate(-26 9.1 11.1)" fill="hsl(var(--card) / .78)" />
      <ellipse cx="8.4" cy="9.2" rx="0.9" ry="1.3" transform="rotate(-26 8.4 9.2)" fill="hsl(var(--card) / .95)" />
      <path
        d="M9.4 15.7 L 9.95 16.85 L 11.1 17.4 L 9.95 17.95 L 9.4 19.1 L 8.85 17.95 L 7.7 17.4 L 8.85 16.85 Z"
        fill="hsl(var(--card) / .72)"
      />
    </svg>
  );
}
