import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';

const rarityStyles: Record<Rarity, string> = {
  common: 'border-rarity-common/40 bg-rarity-common/5',
  uncommon: 'border-rarity-uncommon/40 bg-rarity-uncommon/5',
  rare: 'border-rarity-rare/40 bg-rarity-rare/5',
  epic: 'border-rarity-epic/40 bg-rarity-epic/5',
  legendary: 'border-rarity-legendary/40 bg-rarity-legendary/5 shadow-glow-amber',
  mythic: 'border-rarity-mythic/40 bg-rarity-mythic/5',
};

const rarityBadgeStyles: Record<Rarity, string> = {
  common: 'bg-rarity-common/20 text-rarity-common',
  uncommon: 'bg-rarity-uncommon/20 text-rarity-uncommon',
  rare: 'bg-rarity-rare/20 text-rarity-rare',
  epic: 'bg-rarity-epic/20 text-rarity-epic',
  legendary: 'bg-rarity-legendary/20 text-rarity-legendary',
  mythic: 'bg-rarity-mythic/20 text-rarity-mythic',
};

interface Props {
  card: AnimalCard;
  onClick?: () => void;
  compact?: boolean;
}

const AnimalCardComponent = ({ card, onClick, compact }: Props) => {
  const isShiny = card.rarity === 'legendary' || card.rarity === 'mythic';
  const isMythic = card.rarity === 'mythic';

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-card-appear text-left w-full ${rarityStyles[card.rarity]} ${isMythic ? 'mythic-shiny' : isShiny ? 'holographic-card' : ''}`}
      style={isShiny && !isMythic ? { backgroundImage: 'var(--gradient-holographic)', backgroundSize: '200% 200%' } : undefined}
    >
      {isMythic && (
        <div className="mythic-sparkles">
          <span /><span /><span /><span /><span /><span />
        </div>
      )}
      <div className="relative aspect-square overflow-hidden rounded-t-lg">
        <img
          src={card.image}
          alt={card.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isMythic && <div className="mythic-image-overlay" />}
        {isShiny && !isMythic && <div className="absolute inset-0 card-shimmer pointer-events-none" />}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${rarityBadgeStyles[card.rarity]}`}>
          {RARITY_LABELS[card.rarity]}
        </div>
      </div>
      <div className={`p-3 ${compact ? '' : 'space-y-1'}`}>
        <h3 className="font-display font-bold text-sm text-foreground leading-tight">{card.name}</h3>
        {!compact && (
          <p className="text-[11px] text-muted-foreground italic">{card.scientificName}</p>
        )}
        {!compact && (
          <p className="text-[11px] text-muted-foreground">{card.category}</p>
        )}
      </div>
    </button>
  );
};

export default AnimalCardComponent;
