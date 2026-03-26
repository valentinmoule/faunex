import { useState } from 'react';
import { MapPin, Loader2, RefreshCw, Sparkles, Flame, Zap, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { toast } from 'sonner';
import NearbyRadar from './NearbyRadar';

interface NearbyAnimal {
  name: string;
  scientific_name: string;
  category: string;
  rarity: Rarity;
  description: string;
  tip: string;
}

const rarityDot: Record<string, string> = {
  common: 'bg-rarity-common',
  rare: 'bg-rarity-rare',
  epic: 'bg-rarity-epic',
  mythic: 'bg-rarity-mythic',
};

const rarityBadge: Record<string, string> = {
  common: 'bg-rarity-common/15 text-rarity-common',
  rare: 'bg-rarity-rare/15 text-rarity-rare',
  epic: 'bg-rarity-epic/15 text-rarity-epic',
  mythic: 'bg-rarity-mythic/15 text-rarity-mythic',
};

const rarityCardBorder: Record<string, string> = {
  common: 'border-transparent',
  rare: 'border-rarity-rare/30',
  epic: 'border-rarity-epic/40',
  mythic: 'border-rarity-mythic/50',
};

const rarityCardBg: Record<string, string> = {
  common: 'bg-muted/50',
  rare: 'bg-rarity-rare/5',
  epic: 'bg-rarity-epic/5',
  mythic: 'bg-rarity-mythic/5',
};

interface Props {
  capturedNames: string[];
}

const CACHE_KEY = 'faunex_nearby_cache';

const NearbyAnimalsSection = ({ capturedNames }: Props) => {
  // Restore from sessionStorage on mount
  const cached = (() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw) as { animals: NearbyAnimal[]; locationName: string };
    } catch {}
    return null;
  })();

  const [animals, setAnimals] = useState<NearbyAnimal[]>(cached?.animals || []);
  const [locationName, setLocationName] = useState(cached?.locationName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(!!cached);
  const [alertAnimal, setAlertAnimal] = useState<NearbyAnimal | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchNearby = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible');
      return;
    }

    setLoading(true);
    setError(false);
    setAlertAnimal(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error: fnError } = await supabase.functions.invoke('nearby-animals', {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          });
          if (fnError) throw fnError;
          if (data?.success) {
            const fetched: NearbyAnimal[] = (data.animals || []).slice(0, 3);
            const loc = data.location_name || '';
            setAnimals(fetched);
            setLocationName(loc);
            setHasLoaded(true);
            // Cache in sessionStorage
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ animals: fetched, locationName: loc })); } catch {}

            // Find best rare+ animal for surprise alert
            const special = fetched.find(a => a.rarity === 'mythic')
              || fetched.find(a => a.rarity === 'epic')
              || fetched.find(a => a.rarity === 'rare');
            if (special) {
              setAlertAnimal(special);
              // Auto-dismiss after 6s
              setTimeout(() => setAlertAnimal(null), 6000);
            }
          } else {
            throw new Error(data?.error || 'Erreur');
          }
        } catch (err: any) {
          console.error(err);
          setError(true);
          toast.error("Impossible de charger les animaux à proximité");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError(true);
        toast.error('Autorise la géolocalisation pour cette fonctionnalité');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const capturedNamesLower = new Set(capturedNames.map(n => n.toLowerCase()));

  // Not loaded yet — show activation button
  if (!hasLoaded && !loading && !error) {
    return (
      <div className="mb-4">
        <button
          onClick={fetchNearby}
          className="w-full flex items-center gap-3 p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-display font-bold text-foreground">Autour de toi</h2>
            <p className="text-[10px] text-muted-foreground">Appuie pour découvrir les espèces à proximité</p>
          </div>
        </button>
      </div>
    );
  }

  const alertConfig: Record<string, { icon: typeof Sparkles; label: string; color: string; glowClass: string }> = {
    mythic: { icon: Flame, label: '🔥 Une espèce Mythique est proche !', color: 'text-rarity-mythic', glowClass: 'nearby-alert-mythic' },
    epic: { icon: Zap, label: '⚡ Espèce Épique détectée près de toi', color: 'text-rarity-epic', glowClass: 'nearby-alert-epic' },
    rare: { icon: Sparkles, label: '🔹 Espèce Rare repérée dans ta zone', color: 'text-rarity-rare', glowClass: 'nearby-alert-rare' },
  };

  return (
    <div className="mb-4">
      {/* Surprise alert banner */}
      {alertAnimal && alertConfig[alertAnimal.rarity] && (
        <button
          onClick={() => setAlertAnimal(null)}
          className={`w-full mb-3 px-4 py-3 rounded-2xl border flex items-center gap-3 transition-all animate-nearby-alert-in ${alertConfig[alertAnimal.rarity].glowClass}
            ${alertAnimal.rarity === 'mythic' ? 'bg-rarity-mythic/10 border-rarity-mythic/40' :
              alertAnimal.rarity === 'epic' ? 'bg-rarity-epic/10 border-rarity-epic/40' :
              'bg-rarity-rare/10 border-rarity-rare/40'}`}
        >
          <div className={`nearby-alert-icon ${alertConfig[alertAnimal.rarity].color}`}>
            {(() => { const Icon = alertConfig[alertAnimal.rarity].icon; return <Icon className="w-5 h-5" />; })()}
          </div>
          <div className="text-left flex-1">
            <p className={`text-xs font-display font-bold ${alertConfig[alertAnimal.rarity].color}`}>
              {alertConfig[alertAnimal.rarity].label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{alertAnimal.name} — {alertAnimal.tip}</p>
          </div>
        </button>
      )}

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-display font-bold text-foreground">Autour de toi</h2>
            {locationName && <p className="text-[10px] text-muted-foreground">{locationName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchNearby} disabled={loading} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`transition-all duration-300 overflow-hidden ${collapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
        {loading && !hasLoaded && (
          <div className="flex items-center justify-center py-8 bg-muted/50 rounded-2xl">
            <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
            <span className="text-sm text-muted-foreground font-display">Analyse de ta zone…</span>
          </div>
        )}

        {error && !hasLoaded && (
          <button onClick={fetchNearby} className="w-full py-6 bg-muted/50 rounded-2xl text-center">
            <p className="text-sm text-muted-foreground font-display">Impossible de charger</p>
            <p className="text-xs text-primary font-display mt-1">Réessayer</p>
          </button>
        )}

        {hasLoaded && animals.length > 0 && (
          <div className="space-y-3">
            {/* Radar */}
            <div className="bg-card/50 rounded-2xl border border-border/50 overflow-hidden">
              <NearbyRadar animals={animals} />
            </div>
            {/* Animal list */}
            {animals.map((animal, i) => {
              const alreadyCaptured = capturedNamesLower.has(animal.name.toLowerCase());
              const isSpecial = animal.rarity === 'epic' || animal.rarity === 'mythic';
              return (
                <div
                  key={i}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    alreadyCaptured
                      ? 'bg-primary/5 border-primary/20'
                      : `${rarityCardBg[animal.rarity]} ${rarityCardBorder[animal.rarity]}`
                  } ${isSpecial ? 'nearby-card-glow-' + animal.rarity : ''}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${rarityDot[animal.rarity] || 'bg-muted-foreground'} ${isSpecial ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-display font-semibold text-foreground">{animal.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-display font-bold uppercase ${rarityBadge[animal.rarity] || 'bg-muted text-muted-foreground'}`}>
                        {RARITY_LABELS[animal.rarity as Rarity] || animal.rarity}
                      </span>
                      {alreadyCaptured && (
                        <span className="text-[9px] font-display font-bold text-primary uppercase">✓ Capturé</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground italic">{animal.scientific_name}</p>
                    <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{animal.tip}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyAnimalsSection;
