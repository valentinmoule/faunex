import { Gem, Sparkles } from 'lucide-react';
import { RARITY_LABELS, type Rarity } from '@/data/mockData';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'mythic'];

const badgeVariant: Record<Rarity, string> = {
  common: 'rarity-badge--common',
  rare: 'rarity-badge--rare',
  epic: 'rarity-badge--epic',
  mythic: 'rarity-badge--mythic',
};

/** Badge de rareté façon "gemme de niveau" de jeu mobile :
 *  dégradé vertical, reflet supérieur, tranche sombre en bas. */
export const RarityBadge = ({ rarity, className }: { rarity: string; className?: string }) => {
  const r: Rarity = (RARITIES as string[]).includes(rarity) ? (rarity as Rarity) : 'common';
  const Icon = r === 'mythic' ? Sparkles : Gem;
  return (
    <span className={`rarity-badge ${badgeVariant[r]} ${className ?? ''}`}>
      <Icon className="rarity-badge__icon" strokeWidth={2.5} />
      {RARITY_LABELS[r]}
    </span>
  );
};

export default RarityBadge;