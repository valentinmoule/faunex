import { Map, Lock, Sparkles } from 'lucide-react';

const BestiaireExploreTab = () => {
  return (
    <div className="px-4 pt-6 flex flex-col items-center">
      <div className="w-full aspect-[4/3] rounded-2xl bg-muted/50 border border-border/50 flex flex-col items-center justify-center mb-6 relative overflow-hidden">
        {/* Fake map placeholder with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute inset-0 opacity-10">
          {/* Grid pattern */}
          <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />
        </div>
        
        {/* Animated pins */}
        <div className="absolute top-[25%] left-[30%] w-3 h-3 rounded-full bg-rarity-common animate-pulse" />
        <div className="absolute top-[40%] left-[60%] w-3 h-3 rounded-full bg-rarity-rare animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[60%] left-[45%] w-3.5 h-3.5 rounded-full bg-rarity-epic animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col items-center">
          <Map className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-display font-bold text-foreground/60">Carte d'exploration</p>
          <p className="text-xs text-muted-foreground mt-1">Bientôt disponible</p>
        </div>
      </div>

      {/* Premium teaser */}
      <div className="w-full p-4 rounded-2xl border border-accent/20 bg-accent/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-foreground">Mode Explorateur</h3>
            <p className="text-[11px] text-muted-foreground">Débloque la carte complète</p>
          </div>
          <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground font-body">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-accent" />
            Navigation libre sur la carte
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-accent" />
            Hotspots d'espèces rares
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-accent" />
            Filtres par type et rareté
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BestiaireExploreTab;
