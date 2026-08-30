import { type AnimalCard, type Rarity } from '@/data/mockData';
import { thumbUrl } from '@/lib/imageUrl';
import RarityBadge from '@/components/RarityBadge';

const rarityStyles: Record<Rarity, string> = {
  common: 'border-border bg-card',
  rare: 'border-rarity-rare/25 bg-card game-tile--rare',
  epic: 'border-rarity-silver/25 bg-card game-tile--silver',
  mythic: 'border-rarity-gold/30 bg-card game-tile--gold',
};

interface Props {
  card: AnimalCard;
  onClick?: () => void;
  compact?: boolean;
}

const AnimalCardComponent = ({ card, onClick, compact }: Props) => {
  return (
    <button
      onClick={onClick}
      className={`game-tile group relative overflow-hidden rounded-[22px] border animate-card-appear text-left w-full ${rarityStyles[card.rarity]}`}
    >
      <div className="relative flex h-full flex-col bg-card">
        <div className="relative aspect-[4/5] overflow-hidden">
          <img
            src={thumbUrl(card.image, 400)}
            alt={card.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
<div className="absolute top-2 right-2">
            <RarityBadge rarity={card.rarity} />
          </div>
        </div>
        <div className={`px-3 py-2.5 bg-card ${compact ? '' : 'space-y-0.5'}`}>
          <h3 className="font-display font-semibold text-[13px] text-foreground leading-tight tracking-[-0.01em] truncate">{card.name}</h3>
          {!compact && card.scientificName && (
            <p className="text-[10px] text-muted-foreground italic truncate">{card.scientificName}</p>
          )}
        </div>
      </div>
    </button>
  );
};

export default AnimalCardComponent;
