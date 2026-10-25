import { useId } from 'react';

/**
 * Icône des captures : un appareil photo en volume, dans la continuité de la graine.
 * Dégradé vert, objectif ambré, reflet — uniquement des jetons de thème.
 */
export default function CaptureIcon({ className = '' }: { className?: string }) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, '');
  const shell = `capture-shell-${uid}`;
  const lens = `capture-lens-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className={className}
      style={{ filter: 'drop-shadow(0 1px 1px hsl(var(--learning-shadow) / .3))' }}
    >
      <defs>
        <linearGradient id={shell} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="hsl(var(--forest-light))" />
          <stop offset="55%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--learning-green-base))" />
        </linearGradient>
        <radialGradient id={lens} cx="34%" cy="28%" r="82%">
          <stop offset="0%" stopColor="hsl(var(--amber-light))" />
          <stop offset="55%" stopColor="hsl(var(--amber))" />
          <stop offset="100%" stopColor="hsl(var(--amber-dark))" />
        </radialGradient>
      </defs>

      {/* Boîtier + viseur */}
      <path
        d="M5.2 7.4 H8.6 V6.4 A2 2 0 0 1 10.6 4.4 H13.4 A2 2 0 0 1 15.4 6.4 V7.4 H18.8 A3.6 3.6 0 0 1 22.4 11 V16.8 A3.6 3.6 0 0 1 18.8 20.4 H5.2 A3.6 3.6 0 0 1 1.6 16.8 V11 A3.6 3.6 0 0 1 5.2 7.4 Z"
        fill={`url(#${shell})`}
        stroke="hsl(var(--forest-dark))"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* Reflet du dessus */}
      <path d="M5.8 9 H18.2" stroke="hsl(var(--card) / .45)" strokeWidth="1.3" strokeLinecap="round" />

      {/* Objectif */}
      <circle cx="12" cy="14.2" r="4.5" fill={`url(#${lens})`} stroke="hsl(var(--forest-dark))" strokeWidth="1.2" />
      <circle cx="12" cy="14.2" r="2.1" fill="hsl(var(--forest-dark) / .82)" />
      <ellipse cx="10.4" cy="12.6" rx="1.2" ry="0.85" transform="rotate(-32 10.4 12.6)" fill="hsl(var(--card) / .9)" />
    </svg>
  );
}
