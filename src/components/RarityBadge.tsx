import { useId } from 'react';
import {
  type Rarity,
  RARITY_LABELS,
  RARITY_FX,
  normalizeRarity,
} from '@/data/mockData';

const fxVariant = {
  ink: '',
  silver: 'rarity-badge--silver',
  gold: 'rarity-badge--gold',
} as const;

/** Nombre de symboles par rareté : ● ◆ ★ (encre), ★ argent, ★★ argent, ★ or. */
const SYMBOL_COUNT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1,
  rare: 1,
  very_rare: 1,
  ultra_rare: 2,
  illustration_rare: 1,
  special_rare: 2,
  hyper_rare: 3,
};

/*
 * Géométries SVG dans une boîte 12×12, conçues pour des extents optiques
 * identiques (le losange texte ◆ rendait plus petit selon la police de
 * repli de l'appareil — le SVG garantit un rendu identique partout).
 */
const DIAMOND_PATH = 'M6 0.4 L11.6 6 L6 11.6 L0.4 6 Z';
const STAR_PATH =
  'M6 0 L7.41 4.06 L11.71 4.15 L8.28 6.74 L9.53 10.85 L6 8.4 L2.47 10.85 L3.72 6.74 L0.29 4.15 L4.59 4.06 Z';

const GOLD_STOPS = [
  ['0%', '#ffe98a'],
  ['45%', '#f5b301'],
  ['70%', '#ffd23e'],
  ['100%', '#c47f0a'],
] as const;

const SILVER_STOPS = [
  ['0%', '#f8fafc'],
  ['45%', '#94a3b8'],
  ['70%', '#e2e8f0'],
  ['100%', '#64748b'],
] as const;

/** Jeton de rareté façon carte Pokémon : ● ◆ ★ noirs, ★ argent holo, ★★ argent holo, ★ or holo. */
export const RarityBadge = ({
  rarity,
  className,
  showLabel = false,
}: {
  rarity: string;
  className?: string;
  showLabel?: boolean;
}) => {
  const r = normalizeRarity(rarity);
  const fx = RARITY_FX[r];
  const uid = useId();
  const count = SYMBOL_COUNT[r] ?? 1;
  const gap = 2;
  const width = count * 12 + (count - 1) * gap;
  const fill = fx === 'ink' ? 'hsl(225 15% 18%)' : `url(#${uid}-${fx})`;

  return (
    <span
      className={`rarity-badge rarity-badge--${r.replace(/_/g, '-')} ${fxVariant[fx]} ${r === 'hyper_rare' ? 'rarity-badge--hyper' : ''} ${showLabel ? 'rarity-badge--labeled' : ''} ${className ?? ''}`}
      title={RARITY_LABELS[r]}
      aria-label={`Rareté : ${RARITY_LABELS[r]}`}
    >
      <svg
        className="rarity-badge__symbols"
        width={width}
        height={12}
        viewBox={`0 0 ${width} 12`}
        aria-hidden="true"
      >
        {fx !== 'ink' && (
          <defs>
            <linearGradient id={`${uid}-${fx}`} x1="0" y1="0" x2="1" y2="1">
              {(fx === 'silver' ? SILVER_STOPS : GOLD_STOPS).map(([off, col]) => (
                <stop key={off} offset={off} stopColor={col} />
              ))}
            </linearGradient>
          </defs>
        )}
        {Array.from({ length: count }).map((_, i) =>
          r === 'common' ? (
            <circle
              key={i}
              className="rarity-svg__sym"
              cx={6 + i * (12 + gap)}
              cy={6}
              r={5.4}
              fill={fill}
            />
          ) : (
            <path
              key={i}
              className="rarity-svg__sym"
              d={r === 'uncommon' ? DIAMOND_PATH : STAR_PATH}
              transform={`translate(${i * (12 + gap)}, 0)`}
              fill={fill}
            />
          ),
        )}
      </svg>
      {showLabel && <span className="rarity-badge__label">{RARITY_LABELS[r]}</span>}
    </span>
  );
};

export default RarityBadge;