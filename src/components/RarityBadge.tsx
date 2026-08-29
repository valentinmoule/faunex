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

/** Jeton de rareté façon jeu mobile : icône seule, relief subtil et balayage lumineux. */
export const RarityBadge = ({ rarity, className }: { rarity: string; className?: string }) => {
  const r: Rarity = (RARITIES as string[]).includes(rarity) ? (rarity as Rarity) : 'common';
  const Icon = rarityIcon[r];
  return (
    <span
      className={`rarity-badge ${badgeVariant[r]} ${className ?? ''}`}
      title={RARITY_LABELS[r]}
      aria-label={`Rareté : ${RARITY_LABELS[r]}`}
    >
      <Icon className="rarity-badge__icon" strokeWidth={2.25} />
    </span>
  );
};

export default RarityBadge;
