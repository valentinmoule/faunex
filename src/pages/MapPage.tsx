import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Compass, Search, MapPin, Sparkles, Footprints } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface CaptureMarker {
  id: string;
  animal_name: string;
  scientific_name: string | null;
  category: string;
  rarity: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface DiscoveredAnimal {
  name: string;
  scientific_name: string;
  category: string;
  rarity: string;
  description: string;
  tip: string;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  mythic: '#f59e0b',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
  mythic: 'Mythique',
};

const getCategoryEmoji = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return '🐦';
  if (cat.includes('poisson') || cat.includes('vie marine')) return '🐟';
  if (cat.includes('insecte')) return '🦋';
  if (cat.includes('reptile')) return '🦎';
  if (cat.includes('amphibien')) return '🐸';
  if (cat.includes('arachnide')) return '🕷️';
  if (cat.includes('crustacé')) return '🦀';
  if (cat.includes('mollusque')) return '🐌';
  if (cat.includes('mammifère') && cat.includes('marin')) return '🐋';
  if (cat.includes('mammifère')) return '🦊';
  return '🐾';
};

const buildIcon = (rarity: string, category: string) => {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const emoji = getCategoryEmoji(category);
  return L.divIcon({
    className: 'faunex-pin',
    html: `
      <div class="faunex-pin-outer" style="--pin-color:${color}">
        <div class="faunex-pin-inner">
          <span class="faunex-pin-emoji">${emoji}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const RecenterOnUser = ({ position }: { position: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 11, { animate: true });
  }, [position, map]);
  return null;
};

const CenterTracker = ({ onMove }: { onMove: (center: L.LatLng) => void }) => {
  useMapEvents({
    moveend: (e) => onMove(e.target.getCenter()),
  });
  return null;
};

const MapPage = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [captures, setCaptures] = useState<CaptureMarker[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [center, setCenter] = useState<[number, number]>([46.6, 2.4]);
  const centerRef = useRef<L.LatLng | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<{ location: string; animals: DiscoveredAnimal[] } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data, error } = await supabase
        .from('captures')
        .select('id, animal_name, scientific_name, category, rarity, image_url, latitude, longitude, created_at')
        .eq('user_id', session.user.id)
        .eq('status', 'approved')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!error && data) {
        setCaptures(data as CaptureMarker[]);
        if (data.length > 0) {
          setCenter([data[0].latitude!, data[0].longitude!]);
        }
      }
      setLoading(false);
    })();
  }, [session]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(p);
        setCenter(p);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Géolocalisation indisponible');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(p);
        setCenter(p);
      },
      () => toast.error("Impossible d'obtenir ta position"),
    );
  };

  const discoverInZone = async () => {
    const c = centerRef.current;
    if (!c) {
      toast.error('Déplace la carte sur une zone à explorer');
      return;
    }
    setDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('nearby-animals', {
        body: { latitude: c.lat, longitude: c.lng },
      });
      if (error) throw error;
      setDiscovered({
        location: (data as any).location_name || 'Cette zone',
        animals: (data as any).animals || [],
      });
      setSheetOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('Impossible de chercher les espèces ici');
    } finally {
      setDiscovering(false);
    }
  };

  const markers = useMemo(
    () =>
      captures.map((c) => (
        <Marker key={c.id} position={[c.latitude, c.longitude]} icon={buildIcon(c.rarity)}>
          <Popup className="faunex-popup" closeButton={false}>
            <div className="faunex-popup-card">
              {c.image_url && (
                <div className="relative overflow-hidden rounded-t-xl">
                  <img
                    src={c.image_url}
                    alt={c.animal_name}
                    className="w-full h-28 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-overlay"
                    style={{
                      background: `linear-gradient(135deg, ${RARITY_COLORS[c.rarity]}22 0%, transparent 60%)`,
                    }}
                  />
                </div>
              )}
              <div className="p-3 text-center">
                <p className="font-display font-bold text-sm text-foreground leading-tight">{c.animal_name}</p>
                {c.scientific_name && (
                  <p className="text-[11px] italic text-muted-foreground mt-0.5">{c.scientific_name}</p>
                )}
                <span
                  className="inline-flex items-center gap-1 mt-2 text-[10px] font-display font-bold uppercase px-2.5 py-1 rounded-full"
                  style={{
                    background: `${RARITY_COLORS[c.rarity]}22`,
                    color: RARITY_COLORS[c.rarity],
                  }}
                >
                  <Footprints className="w-3 h-3" />
                  {RARITY_LABELS[c.rarity] || c.rarity}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      )),
    [captures],
  );

  if (loading) return <LoadingScreen />;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Floating glass header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pt-[max(1rem,env(safe-area-inset-top))] px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/60 shadow-card">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-display font-bold text-foreground leading-none">Cartes</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {captures.length} capture{captures.length > 1 ? 's' : ''} géolocalisée{captures.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={locateMe}
              className="p-3 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/60 shadow-card hover:bg-card transition-colors"
              aria-label="Me localiser"
            >
              <Compass className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <button
            onClick={discoverInZone}
            disabled={discovering}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100"
            aria-label="Chercher dans cette zone"
          >
            {discovering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Chercher dans cette zone
          </button>
        </div>
      </div>

      {/* Fullscreen map */}
      <MapContainer
        center={center}
        zoom={captures.length > 0 ? 8 : 6}
        scrollWheelZoom
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <RecenterOnUser position={userPos} />
        <CenterTracker onMove={(c) => { centerRef.current = c; }} />
        {userPos && (
          <Marker
            position={userPos}
            icon={L.divIcon({
              className: 'faunex-user-pin',
              html: `<div class="faunex-user-dot"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        )}
        {markers}
      </MapContainer>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto z-[1200]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 font-display">
              <Sparkles className="w-5 h-5 text-primary" />
              {discovered?.location || 'Espèces à découvrir'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {discovered?.animals.map((a, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-border bg-card"
                style={{ borderColor: RARITY_COLORS[a.rarity] ? `${RARITY_COLORS[a.rarity]}55` : undefined }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-foreground">{a.name}</p>
                    <p className="text-xs italic text-muted-foreground">{a.scientific_name}</p>
                    <p className="text-xs mt-2 text-foreground/80">{a.description}</p>
                    <p className="text-[11px] mt-2 text-muted-foreground"><span className="font-semibold">Astuce&nbsp;:</span> {a.tip}</p>
                  </div>
                  <span
                    className="text-[10px] font-display font-bold uppercase px-2 py-1 rounded-full shrink-0"
                    style={{
                      background: `${RARITY_COLORS[a.rarity] || RARITY_COLORS.common}22`,
                      color: RARITY_COLORS[a.rarity] || RARITY_COLORS.common,
                    }}
                  >
                    {a.rarity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default MapPage;
