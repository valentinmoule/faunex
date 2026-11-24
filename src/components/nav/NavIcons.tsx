import type { SVGProps } from 'react';

/** Icônes maison de la barre de navigation : contour au repos, bicolore + rempli quand actif. */
export type NavIconProps = SVGProps<SVGSVGElement> & { active?: boolean };

const base = (active?: boolean) => ({
  viewBox: '0 0 28 28', fill: 'none', stroke: 'currentColor', strokeWidth: active ? 2.2 : 1.9,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});
const tint = (active?: boolean) => ({ fill: 'currentColor', fillOpacity: active ? 0.22 : 0, stroke: 'none' });

/** Collection : cartes en éventail avec empreinte. */
export function CollectionIcon({ active, ...p }: NavIconProps) {
  return (
    <svg {...base(active)} {...p}>
      <rect x="3.5" y="6" width="12" height="16" rx="2.6" transform="rotate(-12 9.5 14)" opacity={active ? 0.55 : 0.6} />
      <rect x="10" y="4.5" width="13.5" height="18.5" rx="3" {...tint(active)} />
      <rect x="10" y="4.5" width="13.5" height="18.5" rx="3" />
      <ellipse cx="16.75" cy="15.6" rx="2.6" ry="2.2" fill="currentColor" stroke="none" />
      <circle cx="13.7" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16.75" cy="10.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Terrain : carte pliée avec épingle. */
export function TerrainIcon({ active, ...p }: NavIconProps) {
  return (
    <svg {...base(active)} {...p}>
      <path d="M3.5 7.5 10 5l8 2.5 6.5-2.5v15.5L18 23l-8-2.5-6.5 2.5Z" {...tint(active)} />
      <path d="M3.5 7.5 10 5l8 2.5 6.5-2.5v15.5L18 23l-8-2.5-6.5 2.5Z" />
      <path d="M10 5v15.5M18 7.5v4" opacity="0.55" />
      <path d="M18 22.5s-4-3.6-4-6.7a4 4 0 0 1 8 0c0 3.1-4 6.7-4 6.7Z" fill="currentColor" stroke={active ? 'hsl(var(--card))' : 'currentColor'} strokeWidth="1.6" />
      <circle cx="18" cy="15.8" r="1.3" fill="hsl(var(--card))" stroke="none" />
    </svg>
  );
}

/** Capture : appareil avec objectif-feuille. */
export function CaptureIcon({ active, ...p }: NavIconProps) {
  return (
    <svg {...base(active)} {...p}>
      <path d="M4 10.5A2.5 2.5 0 0 1 6.5 8h2.8l1.6-2.5h6.2L18.7 8h2.8a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 4 19.5Z" />
      <circle cx="14" cy="15" r="4.6" />
      <path d="M12 17c0-2.6 1.6-4.2 4.2-4.2 0 2.6-1.6 4.2-4.2 4.2Zm0 0 2.4-2.4" strokeWidth="1.6" />
      <circle cx="20.6" cy="11" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Explorateurs : deux silhouettes avec chapeau d'explorateur. */
export function ExplorersIcon({ active, ...p }: NavIconProps) {
  return (
    <svg {...base(active)} {...p}>
      <circle cx="19.5" cy="11" r="3" opacity="0.6" />
      <path d="M17.5 17.4a5.6 5.6 0 0 1 7 5.1" opacity="0.6" />
      <circle cx="11" cy="12.5" r="3.6" {...tint(active)} />
      <circle cx="11" cy="12.5" r="3.6" />
      <path d="M6 8.6h10M8 8.6c.4-2.4 1.5-3.6 3-3.6s2.6 1.2 3 3.6" />
      <path d="M3.5 23a7.5 7.5 0 0 1 15 0Z" {...tint(active)} />
      <path d="M3.5 23a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** Défis : trophée étoilé. */
export function ChallengesIcon({ active, ...p }: NavIconProps) {
  return (
    <svg {...base(active)} {...p}>
      <path d="M8.5 4.5h11v6.5a5.5 5.5 0 0 1-11 0Z" {...tint(active)} />
      <path d="M8.5 4.5h11v6.5a5.5 5.5 0 0 1-11 0Z" />
      <path d="M8.5 7H5.5v1.5A3.5 3.5 0 0 0 9 12M19.5 7h3v1.5A3.5 3.5 0 0 1 19 12M14 16.5v3.5M9.5 23.5h9l-1-3.5h-7Z" />
      <path d="m14 7.2.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
