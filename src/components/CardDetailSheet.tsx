import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { type AnimalCard, RARITY_LABELS } from '@/data/mockData';
import { MapPin, Leaf, UtensilsCrossed, Shield, Sparkles } from 'lucide-react';

interface Props {
  card: AnimalCard | null;
  open: boolean;
  onClose: () => void;
}

const CardDetailSheet = ({ card, open, onClose }: Props) => {
  if (!card) return null;

  const isShiny = card.rarity === 'legendary' || card.rarity === 'mythic';
  const isMythic = card.rarity === 'mythic';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto p-0">
        <div className={`relative ${isMythic ? 'mythic-shiny' : ''}`}>
          <img src={card.image} alt={card.name} className="w-full aspect-[4/3] object-cover" />
          {isMythic && <div className="mythic-image-overlay" />}
          {isMythic && (
            <div className="mythic-sparkles">
              <span /><span /><span /><span /><span /><span />
            </div>
          )}
          {isShiny && !isMythic && <div className="absolute inset-0 holographic-card card-shimmer pointer-events-none" style={{ backgroundImage: 'var(--gradient-holographic)', backgroundSize: '200% 200%', opacity: 0.3 }} />}
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="px-5 pb-8 -mt-6 relative space-y-5">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-display font-bold uppercase tracking-wider bg-primary/10 text-primary">
                {RARITY_LABELS[card.rarity]}
              </span>
              <span className="text-xs text-muted-foreground">{card.category}</span>
            </div>
            <SheetTitle className="text-2xl font-display">{card.name}</SheetTitle>
            <p className="text-sm text-muted-foreground italic">{card.scientificName}</p>
          </SheetHeader>

          <p className="text-sm text-foreground/80 leading-relaxed">{card.description}</p>

          <div className="space-y-3">
            <InfoRow icon={<MapPin className="w-4 h-4 text-primary" />} label="Habitat" value={card.habitat} />
            <InfoRow icon={<UtensilsCrossed className="w-4 h-4 text-amber" />} label="Alimentation" value={card.diet} />
            <InfoRow icon={<Shield className="w-4 h-4 text-sky" />} label="Conservation" value={card.conservation} />
            <InfoRow icon={<Leaf className="w-4 h-4 text-forest-light" />} label="Lieu" value={card.location} />
          </div>

          <div className="bg-amber/10 border border-amber/20 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-display font-bold text-amber-dark mb-1">Le saviez-vous ?</p>
                <p className="text-sm text-foreground/80">{card.funFact}</p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 shrink-0">{icon}</div>
    <div>
      <p className="text-xs font-display font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  </div>
);

export default CardDetailSheet;
