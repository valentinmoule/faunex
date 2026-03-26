import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';

const rarityStyles: Record<Rarity, string> = {
  common: 'border-rarity-common/30 bg-card card-hover-effect',
  rare: 'border-rarity-rare/40 bg-card rarity-rare-glow card-hover-effect',
  epic: 'border-rarity-epic/40 bg-card rarity-epic-glow card-hover-effect',
  mythic: 'border-rarity-mythic/40 bg-card mythic-shiny card-hover-effect',
};

const rarityBadgeStyles: Record<Rarity, string> = {
  common: 'bg-rarity-common/20 text-rarity-common border border-rarity-common/30',
  rare: 'bg-rarity-rare/15 text-rarity-rare border border-rarity-rare/30 shadow-[0_0_8px_hsla(210,70%,55%,0.3)]',
  epic: 'bg-rarity-epic/15 text-rarity-epic border border-rarity-epic/30 shadow-[0_0_8px_hsla(270,70%,60%,0.3)]',
  mythic: 'bg-rarity-mythic/15 text-rarity-mythic border border-rarity-mythic/30 shadow-[0_0_10px_hsla(42,85%,55%,0.4)]',
};

const rarityAccentBar: Record<Rarity, string> = {
  common: 'bg-rarity-common/20',
  rare: 'bg-gradient-to-r from-rarity-rare/50 to-rarity-rare/10',
  epic: 'bg-gradient-to-r from-rarity-epic/50 to-rarity-epic/10',
  mythic: 'bg-gradient-to-r from-rarity-mythic/60 to-amber-light/20',
};

interface Props {
  card: AnimalCard;
  onClick?: () => void;
  compact?: boolean;
}

const AnimalCardComponent = ({ card, onClick, compact }: Props) => {
  const isMythic = card.rarity === 'mythic';
  const isEpic = card.rarity === 'epic';
  const isRare = card.rarity === 'rare';

  const appearClass = isMythic
    ? 'animate-card-appear-mythic'
    : isEpic
    ? 'animate-card-appear-epic'
    : isRare
    ? 'animate-card-appear-rare'
    : 'animate-card-appear';

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${appearClass} text-left w-full ${rarityStyles[card.rarity]}`}
    >
      {isMythic && (
        <div className="mythic-sparkles">
          <span /><span /><span /><span /><span /><span /><span /><span />
        </div>
      )}
      {isEpic && (
        <div className="epic-sparkles">
          <span /><span /><span /><span />
        </div>
      )}
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-xl">
        <img
          src={card.image}
          alt={card.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Rarity-specific overlays */}
        {isMythic && <div className="mythic-image-overlay" />}
        {isMythic && <div className="mythic-shine-bar" />}
        {isEpic && <div className="epic-image-overlay" />}
        {isEpic && <div className="epic-shine-bar" />}
        {isRare && <div className="absolute inset-0 card-shimmer pointer-events-none" />}
        {isRare && <div className="rare-shine-bar" />}
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
        {/* Rarity badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wider backdrop-blur-md ${rarityBadgeStyles[card.rarity]}`}>
          {RARITY_LABELS[card.rarity]}
        </div>
      </div>
      {/* Rarity accent bar */}
      <div className={`h-[3px] ${rarityAccentBar[card.rarity]}`} />
      <div className={`px-3 py-2.5 ${compact ? '' : 'space-y-0.5'}`}>
        <h3 className="font-display font-bold text-[13px] text-foreground leading-tight truncate">{card.name}</h3>
        {!compact && card.scientificName && (
          <p className="text-[10px] text-muted-foreground italic truncate">{card.scientificName}</p>
        )}
      </div>
    </button>
  );
};

export default AnimalCardComponent;
