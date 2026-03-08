import { useState, useEffect } from 'react';
import { MapPin, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { toast } from 'sonner';

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
  uncommon: 'bg-rarity-uncommon',
  rare: 'bg-rarity-rare',
  epic: 'bg-rarity-epic',
  legendary: 'bg-rarity-legendary',
};

const rarityBadge: Record<string, string> = {
  common: 'bg-rarity-common/15 text-rarity-common',
  uncommon: 'bg-rarity-uncommon/15 text-rarity-uncommon',
  rare: 'bg-rarity-rare/15 text-rarity-rare',
  epic: 'bg-rarity-epic/15 text-rarity-epic',
  legendary: 'bg-rarity-legendary/15 text-rarity-legendary',
};

interface Props {
  capturedNames: string[];
}

const NearbyAnimalsSection = ({ capturedNames }: Props) => {
  const [animals, setAnimals] = useState<NearbyAnimal[]>([]);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchNearby = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible');
      return;
    }

    setLoading(true);
    setError(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error: fnError } = await supabase.functions.invoke('nearby-animals', {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          });
          if (fnError) throw fnError;
          if (data?.success) {
            setAnimals(data.animals || []);
            setLocationName(data.location_name || '');
            setHasLoaded(true);
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

  useEffect(() => {
    fetchNearby();
  }, []);

  const capturedNamesLower = new Set(capturedNames.map(n => n.toLowerCase()));
  const displayed = expanded ? animals : animals.slice(0, 2);

  if (!hasLoaded && !loading && !error) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-foreground">Autour de toi</h2>
            {locationName && <p className="text-[10px] text-muted-foreground">{locationName}</p>}
          </div>
        </div>
        <button onClick={fetchNearby} disabled={loading} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
        <>
          <div className="space-y-2">
            {displayed.map((animal, i) => {
              const alreadyCaptured = capturedNamesLower.has(animal.name.toLowerCase());
              return (
                <div
                  key={i}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    alreadyCaptured
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/50 border-transparent'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${rarityDot[animal.rarity] || 'bg-muted-foreground'}`} />
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

          {animals.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center gap-1 w-full mt-2 py-2 text-xs font-display font-semibold text-primary"
            >
              {expanded ? 'Voir moins' : `Voir les ${animals.length - 2} autres`}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default NearbyAnimalsSection;
