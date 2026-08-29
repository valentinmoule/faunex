import { Hexagon, Gem, Star, Crown } from 'lucide-react';
import { RARITY_LABELS, type Rarity } from '@/data/mockData';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'mythic'];

const badgeVariant: Record<Rarity, string> = {
  common: 'rarity-badge--common',
  rare: 'rarity-badge--rare',
  epic: 'rarity-badge--epic',
  mythic: 'rarity-badge--mythic',
};

const rarityIcon = {
  common: Hexagon,
  rare: Gem,
  epic: Star,
  mythic: Crown,
} as const;

/** Jeton de rareté façon jeu mobile : icône (et label optionnel), relief et balayage lumineux. */
export const RarityBadge = ({
  rarity,
  className,
  showLabel = false,
}: {
  rarity: string;
  className?: string;
  showLabel?: boolean;
}) => {
  const r: Rarity = (RARITIES as string[]).includes(rarity) ? (rarity as Rarity) : 'common';
  const Icon = rarityIcon[r];
  return (
    <span
      className={`rarity-badge ${badgeVariant[r]} ${showLabel ? 'rarity-badge--labeled' : ''} ${className ?? ''}`}
      title={RARITY_LABELS[r]}
      aria-label={`Rareté : ${RARITY_LABELS[r]}`}
    >
      <Icon className="rarity-badge__icon" strokeWidth={2.25} />
      {showLabel && <span className="rarity-badge__label">{RARITY_LABELS[r]}</span>}
    </span>
  );
};

export default RarityBadge;
