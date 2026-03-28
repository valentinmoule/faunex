import { useState } from 'react';
import { MapPin, Loader2, RefreshCw, Sparkles, Flame, Zap, Navigation, Lock, Globe, Map, Search, BookOpen, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { toast } from 'sonner';
import NearbyRadar from '@/components/NearbyRadar';

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
  common: 'border-border/50',
  rare: 'border-rarity-rare/30',
  epic: 'border-rarity-epic/40',
  mythic: 'border-rarity-mythic/50',
};

const rarityCardBg: Record<string, string> = {
  common: 'bg-card',
  rare: 'bg-rarity-rare/5',
  epic: 'bg-rarity-epic/5',
  mythic: 'bg-rarity-mythic/5',
};

const CACHE_KEY = 'faunex_bestiaire_nearby';

interface Props {
  capturedNames: string[];
}

const BestiaireNearbyTab = ({ capturedNames }: Props) => {
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

  const capturedNamesLower = new Set(capturedNames.map(n => n.toLowerCase()));

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
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ animals: fetched, locationName: loc })); } catch {}

            const special = fetched.find(a => a.rarity === 'mythic')
              || fetched.find(a => a.rarity === 'epic')
              || fetched.find(a => a.rarity === 'rare');
            if (special) {
              setAlertAnimal(special);
              setTimeout(() => setAlertAnimal(null), 6000);
            }
          } else {
            throw new Error(data?.error || 'Erreur');
          }
        } catch (err) {
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

  const alertConfig: Record<string, { icon: typeof Sparkles; label: string; color: string }> = {
    mythic: { icon: Flame, label: '🔥 Une espèce Mythique est proche !', color: 'text-rarity-mythic' },
    epic: { icon: Zap, label: '⚡ Espèce Épique détectée près de toi', color: 'text-rarity-epic' },
    rare: { icon: Sparkles, label: '🔹 Espèce Rare repérée dans ta zone', color: 'text-rarity-rare' },
  };

  // Activation state
  if (!hasLoaded && !loading && !error) {
    return (
      <div className="px-4 pt-4 space-y-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Navigation className="w-9 h-9 text-primary" />
          </div>
          <h3 className="text-lg font-display font-bold text-foreground mb-2 text-center">Découvre ce qui t'entoure</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-[260px]">
            Active ta position pour voir les espèces observables autour de toi en ce moment.
          </p>
          <button
            onClick={fetchNearby}
            className="px-6 py-3 bg-primary text-primary-foreground font-display font-bold text-sm rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Activer la localisation
          </button>
        </div>

        {/* Premium teaser */}
        <PremiumTeaser />
      </div>
    );
  }

  if (loading && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-display">Analyse de ta zone…</p>
      </div>
    );
  }

  if (error && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <p className="text-sm text-muted-foreground font-display mb-3">Impossible de charger</p>
        <button onClick={fetchNearby} className="text-sm text-primary font-display font-bold">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 space-y-4">
      {/* Alert banner */}
      {alertAnimal && alertConfig[alertAnimal.rarity] && (
        <button
          onClick={() => setAlertAnimal(null)}
          className={`w-full px-4 py-3 rounded-2xl border flex items-center gap-3 transition-all animate-nearby-alert-in
            ${alertAnimal.rarity === 'mythic' ? 'bg-rarity-mythic/10 border-rarity-mythic/40' :
              alertAnimal.rarity === 'epic' ? 'bg-rarity-epic/10 border-rarity-epic/40' :
              'bg-rarity-rare/10 border-rarity-rare/40'}`}
        >
          {(() => { const Icon = alertConfig[alertAnimal.rarity].icon; return <Icon className={`w-5 h-5 ${alertConfig[alertAnimal.rarity].color}`} />; })()}
          <div className="text-left flex-1">
            <p className={`text-xs font-display font-bold ${alertConfig[alertAnimal.rarity].color}`}>
              {alertConfig[alertAnimal.rarity].label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{alertAnimal.name} — {alertAnimal.tip}</p>
          </div>
        </button>
      )}

      {/* Location + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground font-display">{locationName || 'Position actuelle'}</span>
        </div>
        <button onClick={fetchNearby} disabled={loading} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Radar */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <NearbyRadar animals={animals} />
      </div>

      {/* Animal cards */}
      <div className="space-y-3">
        {animals.map((animal, i) => {
          const alreadyCaptured = capturedNamesLower.has(animal.name.toLowerCase());
          const isSpecial = animal.rarity === 'epic' || animal.rarity === 'mythic';
          return (
            <div
              key={i}
              className={`relative p-4 rounded-2xl border transition-all ${
                alreadyCaptured
                  ? 'bg-primary/5 border-primary/20'
                  : `${rarityCardBg[animal.rarity]} ${rarityCardBorder[animal.rarity]}`
              } ${isSpecial ? 'nearby-card-glow-' + animal.rarity : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${rarityDot[animal.rarity]} ${isSpecial ? 'animate-pulse' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-display font-bold text-foreground">{animal.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-display font-bold uppercase ${rarityBadge[animal.rarity]}`}>
                      {RARITY_LABELS[animal.rarity as Rarity] || animal.rarity}
                    </span>
                    {alreadyCaptured ? (
                      <span className="text-[9px] font-display font-bold text-primary uppercase">✓ Capturé</span>
                    ) : (
                      <span className="text-[9px] font-display font-bold text-accent uppercase">Nouveau</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">{animal.scientific_name}</p>
                  <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed">{animal.tip}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {animals.length > 0 && (
        <button
          onClick={() => {/* future: navigate to capture */}}
          className="w-full py-3.5 bg-primary text-primary-foreground font-display font-bold text-sm rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
        >
          🎯 Commencer une quête
        </button>
      )}

      {/* Premium teaser */}
      <PremiumTeaser />
    </div>
  );
};

const PremiumTeaser = () => (
  <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5">
    <div className="absolute top-3 right-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Globe className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 pr-8">
        <h3 className="text-sm font-display font-bold text-foreground mb-1">Explorer d'autres zones</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Débloque l'accès à toutes les régions, les hotspots d'espèces rares et la recherche avancée.
        </p>
      </div>
    </div>
    <button className="mt-4 w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-display font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-70">
      <Lock className="w-3.5 h-3.5" />
      Bientôt disponible
    </button>
  </div>
);

export default BestiaireNearbyTab;
