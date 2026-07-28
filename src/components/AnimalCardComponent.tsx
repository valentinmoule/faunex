import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';

const rarityStyles: Record<Rarity, string> = {
  common: 'border-border bg-card card-hover-effect shadow-card',
  rare: 'border-rarity-rare/25 bg-card card-hover-effect shadow-[0_1px_2px_hsla(165,25%,11%,0.05),0_10px_28px_-14px_hsl(var(--rarity-rare)/0.6)]',
  epic: 'border-rarity-epic/25 bg-card card-hover-effect shadow-[0_1px_2px_hsla(165,25%,11%,0.05),0_10px_28px_-14px_hsl(var(--rarity-epic)/0.6)]',
  mythic: 'border-rarity-mythic/30 bg-card card-hover-effect shadow-[0_1px_2px_hsla(165,25%,11%,0.05),0_10px_28px_-14px_hsl(var(--rarity-mythic)/0.7)]',
};

const rarityBadgeStyles: Record<Rarity, string> = {
  common: 'bg-rarity-common/20 text-rarity-common border border-rarity-common/30',
  rare: 'bg-rarity-rare/15 text-rarity-rare border border-rarity-rare/30 shadow-[0_0_8px_hsla(210,70%,55%,0.3)]',
  epic: 'bg-rarity-epic/15 text-rarity-epic border border-rarity-epic/30 shadow-[0_0_8px_hsla(270,70%,60%,0.3)]',
  mythic: 'bg-rarity-mythic/15 text-rarity-mythic border border-rarity-mythic/30 shadow-[0_0_10px_hsla(42,85%,55%,0.4)]',
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
      className={`group relative overflow-hidden rounded-[22px] border transition-all duration-300 active:scale-[0.98] animate-card-appear text-left w-full ${rarityStyles[card.rarity]}`}
    >
      <div className="relative flex h-full flex-col bg-card">
        <div className="relative aspect-[4/5] overflow-hidden">
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wider backdrop-blur-md ${rarityBadgeStyles[card.rarity]}`}>
            {RARITY_LABELS[card.rarity]}
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
