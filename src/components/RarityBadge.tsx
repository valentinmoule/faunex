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

/** Nombre de symboles par rareté : 1–3 ★ grises, 1–3 ★ dorées, 1–2 ★ irisées. */
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

/** Reflets métalliques identiques aux trois finitions des contours de carte. */
const METAL_STOPS = {
  gray: [
    ['0%', '--rarity-icon-gray-dark'],
    ['20%', '--rarity-icon-gray-light'],
    ['37%', '--rarity-icon-gray-mid'],
    ['55%', '--rarity-icon-gray-light'],
    ['76%', '--rarity-icon-gray-dark'],
    ['100%', '--rarity-icon-gray-mid'],
  ],
  gold: [
    ['0%', '--rarity-icon-gold-dark'],
    ['20%', '--rarity-icon-gold-light'],
    ['38%', '--rarity-icon-gold-mid'],
    ['55%', '--rarity-icon-gold-light'],
    ['78%', '--rarity-icon-gold-dark'],
    ['100%', '--rarity-icon-gold-mid'],
  ],
  iridescent: [
    ['0%', '--rarity-icon-pearl-gray'],
    ['18%', '--rarity-icon-pearl-pink'],
    ['36%', '--rarity-icon-pearl-blue'],
    ['52%', '--rarity-icon-pearl-light'],
    ['72%', '--rarity-icon-pearl-pink'],
    ['88%', '--rarity-icon-pearl-blue'],
    ['100%', '--rarity-icon-pearl-gray'],
  ],
} as const;

const METAL_BY_RARITY: Record<Rarity, keyof typeof METAL_STOPS> = {
  common: 'gray',
  uncommon: 'gray',
  rare: 'gray',
  very_rare: 'gold',
  ultra_rare: 'gold',
  illustration_rare: 'gold',
  special_rare: 'iridescent',
  hyper_rare: 'iridescent',
};

/** Jeton de rareté : les étoiles reprennent les trois finitions des cartes. */
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
  const metal = METAL_BY_RARITY[r];
  const count = SYMBOL_COUNT[r] ?? 1;
  const gap = 2;
  /* Marge de sécurité pour que le contour sombre des étoiles ne soit pas
     rogné par la boîte SVG (les branches touchent les bords du motif). */
  const pad = plain ? 1.2 : 0;
  const width = count * 12 + (count - 1) * gap + pad * 2;
  const height = 12 + pad * 2;
  const fill = `url(#${uid}-${metal})`;

  return (
    <span
      className={`rarity-badge rarity-badge--${r.replace(/_/g, '-')} ${fxVariant[fx]} ${r === 'hyper_rare' ? 'rarity-badge--hyper' : ''} ${showLabel ? 'rarity-badge--labeled' : ''} ${plain ? 'rarity-badge--plain' : ''} ${className ?? ''}`}
      title={RARITY_LABELS[r]}
      aria-label={t('bestiary.rarity.ariaLabel', { label: RARITY_LABELS[r] })}
    >
      <svg
        className="rarity-badge__symbols"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-${metal}`} x1="0" y1="0" x2="1" y2="1">
            {METAL_STOPS[metal].map(([off, token]) => (
              <stop key={off} offset={off} stopColor={`hsl(var(${token}))`} />
            ))}
          </linearGradient>
        </defs>
        {Array.from({ length: count }).map((_, i) => (
          <path
            key={i}
            className="rarity-svg__sym"
            d={STAR_PATH}
            transform={`translate(${pad + i * (12 + gap)}, ${pad})`}
            fill={fill}
          />
        ))}
      </svg>
      {showLabel && <span className="rarity-badge__label">{RARITY_LABELS[r]}</span>}
    </span>
  );
};

export default RarityBadge;