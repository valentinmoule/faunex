import {
  RARITY_LABELS,
  RARITY_SYMBOLS,
  RARITY_FX,
  normalizeRarity,
} from '@/data/mockData';

const fxVariant = {
  ink: '',
  silver: 'rarity-badge--silver',
  gold: 'rarity-badge--gold',
} as const;

/** Jeton de rareté façon carte Pokémon : ● ◆ ★ noirs, ★★ argent holo, ★ or holo. */
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
  const symbols = RARITY_SYMBOLS[r];
  return (
    <span
      className={`rarity-badge ${fxVariant[fx]} ${r === 'hyper_rare' ? 'rarity-badge--hyper' : ''} ${showLabel ? 'rarity-badge--labeled' : ''} ${className ?? ''}`}
      title={RARITY_LABELS[r]}
      aria-label={`Rareté : ${RARITY_LABELS[r]}`}
    >
      <span className="rarity-badge__symbols" aria-hidden="true">
        {symbols.map((s, i) => (
          <span key={i} className="rarity-badge__sym">{s}</span>
        ))}
      </span>
      {showLabel && <span className="rarity-badge__label">{RARITY_LABELS[r]}</span>}
    </span>
  );
};

export default RarityBadge;
