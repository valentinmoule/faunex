import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Compass, Search, MapPin, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface CaptureMarker {
  id: string;
  animal_name: string;
  scientific_name: string | null;
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

const buildIcon = (rarity: string) => {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  return L.divIcon({
    className: 'faunex-pin',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:14px;">🐾</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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
  const [center, setCenter] = useState<[number, number]>([46.6, 2.4]); // France centrale par défaut
  const centerRef = useRef<L.LatLng | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<{ location: string; animals: DiscoveredAnimal[] } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data, error } = await supabase
        .from('captures')
        .select('id, animal_name, scientific_name, rarity, image_url, latitude, longitude, created_at')
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
          <Popup>
            <div className="text-center min-w-[140px]">
              {c.image_url && (
                <img src={c.image_url} alt={c.animal_name} className="w-full h-24 object-cover rounded-md mb-2" />
              )}
              <p className="font-bold text-sm">{c.animal_name}</p>
              {c.scientific_name && <p className="text-xs italic text-muted-foreground">{c.scientific_name}</p>}
              <p className="text-[10px] mt-1 uppercase tracking-wide" style={{ color: RARITY_COLORS[c.rarity] }}>
                {c.rarity}
              </p>
            </div>
          </Popup>
        </Marker>
      )),
    [captures],
  );

  if (loading) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Cartes</h1>
              <p className="text-[11px] text-muted-foreground">{captures.length} capture{captures.length > 1 ? 's' : ''} géolocalisée{captures.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={locateMe}
            className="p-2 rounded-full bg-muted hover:bg-muted/70 transition-colors"
            aria-label="Me localiser"
          >
            <Compass className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      <div className="relative">
        <div className="h-[calc(100vh-9rem-4rem)] w-full">
          <MapContainer
            center={center}
            zoom={captures.length > 0 ? 8 : 6}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterOnUser position={userPos} />
            <CenterTracker onMove={(c) => { centerRef.current = c; }} />
            {userPos && (
              <Marker
                position={userPos}
                icon={L.divIcon({
                  className: 'faunex-user-pin',
                  html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(var(--primary));border:3px solid #fff;box-shadow:0 0 0 4px hsla(var(--primary),0.25)"></div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                })}
              />
            )}
            {markers}
          </MapContainer>
        </div>

        <div className="absolute bottom-4 left-0 right-0 z-[1000] px-4 flex justify-center pointer-events-none">
          <button
            onClick={discoverInZone}
            disabled={discovering}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm shadow-lg disabled:opacity-70"
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
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
