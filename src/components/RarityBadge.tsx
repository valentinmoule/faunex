import { useId } from 'react';
import { useTranslation } from 'react-i18next';
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

/** Nombre de symboles par rareté : 1–3 ★ plates grises, 1–3 ★ argent, 1–2 ★ or. */
const SYMBOL_COUNT: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  very_rare: 1,
  ultra_rare: 2,
  illustration_rare: 3,
  special_rare: 1,
  hyper_rare: 2,
};

/*
 * Géométrie SVG d'étoile dans une boîte 12×12, conçue pour un extent optique
 * identique partout (le losange texte ◆ rendait plus petit selon la police de
 * repli de l'appareil — le SVG garantit un rendu identique).
 * Bras épais : rayon interne remonté (2,3 → 3,2) pour une étoile pleine,
 * lisible en petit, sans trait filiforme.
 */
const STAR_PATH =
  'M6 0 L7.88 3.41 L11.71 4.15 L9.05 6.99 L9.53 10.85 L6 9.2 L2.47 10.85 L2.95 6.99 L0.29 4.15 L4.12 3.41 Z';

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

/** Couleur plate (sans dégradé) des trois premiers paliers : gris simple. */
const FLAT_FILL: Partial<Record<Rarity, string>> = {
  common: 'hsl(215 16% 47%)',
  uncommon: 'hsl(215 16% 47%)',
  rare: 'hsl(215 16% 47%)',
};

/** Jeton de rareté : 1–3 ★ plates grises (paliers bas), 1–3 ★ argent holo, 1–2 ★ or holo. */
export const RarityBadge = ({
  rarity,
  className,
  showLabel = false,
  plain = false,
}: {
  rarity: string;
  className?: string;
  showLabel?: boolean;
  /** Sans pastille : étoiles seules, posées directement sur le fond (filtres, cartes). */
  plain?: boolean;
}) => {
  const { t } = useTranslation();
  const r = normalizeRarity(rarity);
  const fx = RARITY_FX[r];
  const uid = useId();
  const count = SYMBOL_COUNT[r] ?? 1;
  const gap = 2;
  /* Marge de sécurité pour que le contour sombre des étoiles ne soit pas
     rogné par la boîte SVG (les branches touchent les bords du motif). */
  const pad = plain ? 1.2 : 0;
  const width = count * 12 + (count - 1) * gap + pad * 2;
  const height = 12 + pad * 2;
  const fill =
    fx === 'ink'
      ? FLAT_FILL[r] ?? 'hsl(225 15% 18%)'
      : `url(#${uid}-${fx})`;

  return (
    <span
      className={`rarity-badge rarity-badge--${r.replace(/_/g, '-')} ${fxVariant[fx]} ${r === 'hyper_rare' ? 'rarity-badge--hyper' : ''} ${showLabel ? 'rarity-badge--labeled' : ''} ${plain ? 'rarity-badge--plain' : ''} ${className ?? ''}`}
      title={RARITY_LABELS[r]}
      aria-label={t('bestiary.rarity.ariaLabel', { label: RARITY_LABELS[r] })}
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
        {Array.from({ length: count }).map((_, i) => (
          <path
            key={i}
            className="rarity-svg__sym"
            d={STAR_PATH}
            transform={`translate(${i * (12 + gap)}, 0)`}
            fill={fill}
          />
        ))}
      </svg>
      {showLabel && <span className="rarity-badge__label">{RARITY_LABELS[r]}</span>}
    </span>
  );
};

export default RarityBadge;