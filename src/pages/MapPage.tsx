import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import '@maplibre/maplibre-gl-leaflet';
import { buildFaunexMapStyle, makeTreePattern, pickZoneLayer, zoneKindOfLayer, ZONE_LAYERS, type ZoneKind } from '@/lib/faunexMap';
import { Check, Compass, Radar, Crown, Eye, EyeOff, Hand, MapPin, Bird, Fish, Bug, Turtle, Shell, Snail, Waves, PawPrint } from 'lucide-react';
import { FrogIcon } from '@/components/icons/FrogIcon';
import { SpiderIcon } from '@/components/icons/SpiderIcon';
import { supabase } from '@/integrations/supabase/client';
import { thumbUrl } from '@/lib/imageUrl';
import { fetchAllRows } from '@/lib/fetchAll';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RareRadarLayer, RareRadarDeck, type RareSighting } from '@/components/premium/RareRadar';
import { mergeRadarSources, type PotentialSpecies } from '@/lib/radarSources';
import LoadingScreen from '@/components/LoadingScreen';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS, RARITY_ORDER } from '@/data/mockData';
import { toast } from 'sonner';
import { getCurrentPosition, isGeolocationAvailable } from '@/lib/geo';
import { useTranslation } from 'react-i18next';
import { fetchZoneSpecies, type ZoneSpecies } from '@/lib/zoneSpecies';
import { getCategoryIcon as getBestiaryCategoryIcon } from '@/lib/bestiary';
import { RarityBadge } from '@/components/RarityBadge';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';
import { hapticTap } from '@/lib/haptics';


interface CaptureMarker {
  id: string;
  animal_name: string;
  scientific_name: string | null;
  category: string;
  rarity: string;
  image_url: string | null;
  description: string | null;
  habitat: string | null;
  diet: string | null;
  conservation: string | null;
  fun_fact: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}


// Mêmes teintes que les cadres de rareté des cartes (--rarity-* dans index.css)
const RARITY_COLORS: Record<string, string> = {
  common: 'hsl(220 9% 46%)',
  uncommon: 'hsl(152 62% 36%)',
  rare: 'hsl(210 92% 50%)',
  very_rare: 'hsl(265 72% 55%)',
  ultra_rare: 'hsl(220 18% 62%)',
  illustration_rare: 'hsl(43 95% 52%)',
  special_rare: 'hsl(33 96% 50%)',
  hyper_rare: 'hsl(24 98% 50%)',
};

// Cadre de la vignette = teinte du cadre de carte de cette rareté
const RARITY_FRAMES: Record<string, string> = {
  common: 'var(--pin-frame-neutral)',
  uncommon: 'var(--pin-frame-neutral)',
  rare: 'var(--pin-frame-neutral)',
  very_rare: 'var(--pin-frame-gold)',
  ultra_rare: 'var(--pin-frame-gold)',
  illustration_rare: 'var(--pin-frame-gold)',
  special_rare: 'var(--rarity-frame-mythic)',
  hyper_rare: 'var(--rarity-frame-legendary)',
};




const getCategoryIcon = categoryLineIcon;

const RARITY_ORDER_LOCAL = RARITY_ORDER;

const buildIcon = (rarity: string, category: string, count = 1, imageUrl?: string | null) => {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const frame = RARITY_FRAMES[rarity] || RARITY_FRAMES.common;
  const CatIcon = getCategoryIcon(category);
  const iconSvg = renderToStaticMarkup(
    <CatIcon color={color} strokeWidth={2.2} />
  );
  const photo = imageUrl
    ? `<img class="faunex-pin-photo" src="${thumbUrl(imageUrl, 160, 72)}" alt="" width="42" height="42" draggable="false" />`
    : `<span class="faunex-pin-icon">${iconSvg}</span>`;
  return L.divIcon({
    className: 'faunex-pin',
    html: `
      <div class="faunex-pin-outer" style="--pin-color:${color};--pin-frame:${frame}">
        <div class="faunex-pin-inner">
          ${photo}
        </div>
        ${count > 1 ? `<span class="faunex-pin-count">${count > 99 ? '99+' : count}</span>` : ''}
      </div>
    `,
    iconSize: [54, 70],
    iconAnchor: [27, 66],
  });
};



const RecenterOnUser = ({ position, animate }: { position: [number, number] | null; animate: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, animate ? Math.max(map.getZoom(), 8) : map.getZoom(), { animate });
  }, [position, map]);
  return null;
};

maplibregl.setWorkerUrl(maplibreWorkerUrl);

/** Fond vectoriel Faunex (données OpenStreetMap via OpenFreeMap) sous les vignettes Leaflet. */
const FaunexBaseLayer = ({ onReady }: { onReady: (gl: maplibregl.Map) => void }) => {
  const map = useMap();
  useEffect(() => {
    const layer = (L as any).maplibreGL({
      style: buildFaunexMapStyle(),
      attributionControl: false,
    });
    layer.addTo(map);
    const gl: maplibregl.Map = layer.getMaplibreMap();
    const pattern = makeTreePattern();
    gl.on('styleimagemissing', (e) => {
      if (e.id === 'fx-trees' && pattern && !gl.hasImage('fx-trees')) gl.addImage('fx-trees', pattern);
    });
    onReady(gl);
    return () => { layer.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
};

/** Toucher simple uniquement : un double-toucher (zoom) n'ouvre pas de zone. */
const ZoneTapHandler = ({ onTap }: { onTap: (latlng: L.LatLng) => void }) => {
  const timer = useRef<number | null>(null);
  const cancel = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };
  useMapEvents({
    click: (e) => { cancel(); timer.current = window.setTimeout(() => { timer.current = null; onTap(e.latlng); }, 280); },
    dblclick: cancel,
    zoomstart: cancel,
  });
  useEffect(() => cancel, []);
  return null;
};

interface SelectedZone {
  kind: ZoneKind;
  name: string | null;
  /** null = chargement en cours */
  species: ZoneSpecies[] | null;
  failed?: boolean;
}

const CenterTracker = ({ onMove, onZoom }: { onMove: (center: L.LatLng) => void; onZoom: (z: number) => void }) => {
  useMapEvents({
    moveend: (e) => onMove(e.target.getCenter()),
    zoomend: (e) => onZoom(e.target.getZoom()),
  });
  return null;
};


interface MapPageProps {
  embedded?: boolean;
}

const MapPage = ({ embedded = false }: MapPageProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [captures, setCaptures] = useState<CaptureMarker[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  // Démarre là où la carte était, sans glisser depuis la France vers la position.
  const [initialView] = useState<{ c: [number, number]; z: number }>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('faunex.map.view') || 'null');
      if (v && Array.isArray(v.c) && typeof v.z === 'number') return v;
    } catch { /* ignore */ }
    return { c: [46.6, 2.4], z: 6 };
  });
  const [center, setCenter] = useState<[number, number]>(initialView.c);
  const hasSavedView = useRef(initialView.z !== 6 || initialView.c[0] !== 46.6);
  const [animateRecenter, setAnimateRecenter] = useState(false);
  const centerRef = useRef<L.LatLng | null>(null);
  const [scanHere, setScanHere] = useState(false);
  const userPosRef = useRef<[number, number] | null>(null);
  userPosRef.current = userPos;
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [groupItems, setGroupItems] = useState<CaptureMarker[] | null>(null);
  const [zoom, setZoom] = useState(8);
  const glRef = useRef<maplibregl.Map | null>(null);
  const [zone, setZone] = useState<SelectedZone | null>(null);
  const zoneRequest = useRef<AbortController | null>(null);
  const { speciesName } = useSpeciesName();
  const { isPremium } = useSubscription(session?.user?.id);
  const [rareOpen, setRareOpen] = useState(false);
  const [rareItems, setRareItems] = useState<RareSighting[]>([]);
  const [rareState, setRareState] = useState<'scanning' | 'ready' | 'nolocation'>('scanning');
  const [rareSel, setRareSel] = useState(0);
  const [rarePulse, setRarePulse] = useState(0);
  const [rareOrigin, setRareOrigin] = useState<[number, number] | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const [deckH, setDeckH] = useState(0);
  useEffect(() => {
    const el = deckRef.current;
    if (!rareOpen || !el) { setDeckH(0); return; }
    const ro = new ResizeObserver(() => setDeckH(el.offsetHeight - 28));
    ro.observe(el);
    return () => ro.disconnect();
  }, [rareOpen]);
  // Un seul scan, deux sources : observations récentes des explorateurs + espèces potentielles de la zone.
  const fetchPotentials = async (pos: [number, number]): Promise<PotentialSpecies[]> => {
    const { data, error } = await supabase.functions.invoke('nearby-animals', { body: { latitude: pos[0], longitude: pos[1] } });
    if (error) { console.error(error); return []; }
    return ((data as { animals?: PotentialSpecies[] } | null)?.animals) ?? [];
  };
  const startRareScan = async () => {
    hapticTap();
    setRareOpen(true); setRareItems([]); setRareSel(0); setRareState('scanning');
    let pos: [number, number] | null = scanHere && centerRef.current ? [centerRef.current.lat, centerRef.current.lng] : userPosRef.current;
    if (!pos && isGeolocationAvailable()) {
      pos = await new Promise<[number, number] | null>((res) => { void getCurrentPosition((p) => res([p.coords.latitude, p.coords.longitude]), () => res(null), { timeout: 8000 }); });
      if (pos) setUserPos(pos);
    }
    if (!pos) { setRareState('nolocation'); return; }
    setRareOrigin(pos); setRarePulse((k) => k + 1);
    const started = Date.now();
    const [sightings, potentials] = await Promise.all([
      supabase.rpc('nearby_sightings', { p_lat: pos[0], p_lng: pos[1], p_radius_km: 10 }).then(({ data }) => (data ?? []) as Omit<RareSighting, 'kind'>[]),
      fetchPotentials(pos).catch(() => [] as PotentialSpecies[]),
    ]);
    window.setTimeout(() => {
      setRareItems(mergeRadarSources(sightings, potentials)); setRareState('ready');
    }, Math.max(0, 1800 - (Date.now() - started)));
  };
  const [showCaptures, setShowCaptures] = useState(true);
  const [hintSeen, setHintSeen] = useState(() => { try { return localStorage.getItem('faunex.map.zoneHint') === '1'; } catch { return false; } });
  const dismissHint = () => { setHintSeen(true); try { localStorage.setItem('faunex.map.zoneHint', '1'); } catch { /* ignore */ } };

  const setHighlight = (features: GeoJSON.Feature[]) => {
    const src = glRef.current?.getSource('fx-selected') as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features });
  };

  // Toucher une zone (forêt, eau, prairie, parc…) : espèces réellement observées dans la zone (GBIF).
  const handleZoneTap = (latlng: L.LatLng) => {
    const gl = glRef.current;
    if (!gl || !gl.isStyleLoaded()) return;
    const point = gl.project([latlng.lng, latlng.lat]);
    const layers = ZONE_LAYERS.map((l) => l.id).filter((id) => gl.getLayer(id));
    const hit = pickZoneLayer<maplibregl.MapGeoJSONFeature>(gl.queryRenderedFeatures(point, { layers }));
    if (!hit) {
      setHighlight([]);
      return;
    }
    // Une même zone est découpée en tuiles : on regroupe ses morceaux visibles.
    const pieces = hit.id != null
      ? gl.queryRenderedFeatures({ layers: [hit.layer.id] }).filter((f) => f.id === hit.id)
      : [hit];
    const geoms = pieces.length ? pieces : [hit];
    const props = hit.properties || {};
    dismissHint();
    setHighlight(geoms.map((f) => ({ type: 'Feature', properties: {}, geometry: f.geometry })) as GeoJSON.Feature[]);
    setZone({
      kind: zoneKindOfLayer(hit.layer.id) ?? 'forest',
      name: (props['name:fr'] as string) || (props.name as string) || null,
      species: null,
    });
    zoneRequest.current?.abort();
    const request = new AbortController();
    zoneRequest.current = request;
    fetchZoneSpecies(geoms.map((f) => f.geometry as any), request.signal)
      .then((species) => {
        if (!request.signal.aborted) setZone((z) => (z ? { ...z, species } : z));
      })
      .catch(() => {
        if (!request.signal.aborted) setZone((z) => (z ? { ...z, species: [], failed: true } : z));
      });
  };

  const capturedNames = useMemo(
    () => new Set(captures.map((c) => (c.animal_name || '').trim().toLowerCase())),
    [captures],
  );



  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data, error } = await fetchAllRows<any>((from, to) =>
        supabase
          .from('captures')
          .select('id, animal_name, scientific_name, category, rarity, image_url, description, habitat, diet, conservation, fun_fact, location, latitude, longitude, created_at')
          .eq('user_id', session.user.id)
          .eq('status', 'approved')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .range(from, to),
      );

      if (!error && data) {
        setCaptures(data as CaptureMarker[]);
        if (data.length > 0 && !hasSavedView.current) {
          setCenter([data[0].latitude!, data[0].longitude!]);
        }
      }
      setLoading(false);
    })();
  }, [session]);

  useEffect(() => {
    void getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setAnimateRecenter(false);
        setUserPos(p);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  const locateMe = () => {
    requestCompass();
    if (!isGeolocationAvailable()) {
      toast.error(t('map.errors.geoUnavailable'));
      return;
    }
    void getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setAnimateRecenter(true);
        setUserPos([p[0], p[1]]);
      },
      () => toast.error(t('map.errors.geoPositionError')),
    );
  };

  const [heading, setHeading] = useState<number | null>(null);
  const compassOn = useRef(false);
  const startCompass = () => {
    if (compassOn.current) return;
    compassOn.current = true;
    let last = -999;
    const handler = (e: DeviceOrientationEvent) => {
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      const h = typeof ios === 'number' ? ios : e.absolute && e.alpha != null ? 360 - e.alpha : null;
      if (h == null) return;
      if (Math.abs(((h - last + 540) % 360) - 180) < 4) return;
      last = h;
      setHeading(Math.round(h));
    };
    window.addEventListener('deviceorientationabsolute' as 'deviceorientation', handler as EventListener);
    window.addEventListener('deviceorientation', handler);
  };
  const requestCompass = () => {
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (DOE?.requestPermission) {
      DOE.requestPermission().then((r) => { if (r === 'granted') startCompass(); }).catch(() => {});
    } else startCompass();
  };
  useEffect(() => {
    // Android et navigateurs sans permission : boussole dès l'ouverture
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (DOE && !DOE.requestPermission) startCompass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const userIcon = useMemo(() => L.divIcon({
    className: 'faunex-user-pin',
    html: `${heading != null ? `<div class="faunex-user-cone" style="transform:translate(-50%,-100%) rotate(${heading}deg)"></div>` : ''}<div class="faunex-user-dot"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }), [heading]);

  const openCapture = (c: CaptureMarker) => {
    setSelectedCard({
      id: c.id,
      name: c.animal_name,
      scientificName: c.scientific_name || '',
      image: c.image_url || '',
      rarity: c.rarity as Rarity,
      category: c.category || '',
      description: c.description || '',
      habitat: c.habitat || '',
      diet: c.diet || '',
      conservation: c.conservation || '',
      funFact: c.fun_fact || '',
      discoveredAt: c.created_at,
      location: c.location || '',
    });
  };

  const groups = useMemo(() => {
    const map = new Map<string, CaptureMarker[]>();
    captures.forEach((c) => {
      const key = `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`;
      const arr = map.get(key);
      if (arr) arr.push(c);
      else map.set(key, [c]);
    });
    return Array.from(map.entries()).map(([key, items]) => {
      const sorted = [...items].sort(
        (a, b) => RARITY_ORDER_LOCAL.indexOf(b.rarity as Rarity) - RARITY_ORDER_LOCAL.indexOf(a.rarity as Rarity),
      );
      return { key, items: sorted, lead: sorted[0] };
    });
  }, [captures]);

  const markers = useMemo(
    () =>
      groups.flatMap((g) => {
        // Au zoom élevé, on éclate les captures empilées en couronnes (écart constant à l'écran)
        if (g.items.length > 1 && zoom >= 13) {
          const latRad = (g.lead.latitude * Math.PI) / 180;
          // mètres par pixel à ce zoom, puis conversion en degrés
          const mPerPx = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
          const degPerPx = mPerPx / 111320;
          const PIN = 52; // taille du pin + marge, en px

          // répartition en anneaux : 8 pins max sur le 1er, puis de plus en plus
          const rings: CaptureMarker[][] = [];
          let idx = 0;
          let ring = 0;
          while (idx < g.items.length) {
            const capacity = ring === 0 ? 8 : 8 + ring * 5;
            rings.push(g.items.slice(idx, idx + capacity));
            idx += capacity;
            ring += 1;
          }

          return rings.flatMap((items, ringIndex) => {
            const radiusPx = Math.max(
              PIN * 0.75,
              (PIN * items.length) / (2 * Math.PI),
            ) + ringIndex * PIN;
            const radiusDeg = radiusPx * degPerPx;
            const offset = ringIndex * (Math.PI / items.length);
            return items.map((c, i) => {
              const angle = (2 * Math.PI * i) / items.length + offset;
              const lat = c.latitude + radiusDeg * Math.cos(angle);
              const lng =
                c.longitude + (radiusDeg * Math.sin(angle)) / Math.max(0.2, Math.cos(latRad));
              return (
                <Marker
                  key={c.id}
                  position={[lat, lng]}
                  icon={buildIcon(c.rarity, c.category, 1, c.image_url)}
                  eventHandlers={{ click: () => openCapture(c) }}
                />
              );
            });
          });
        }

        return [
          <Marker
            key={g.key}
            position={[g.lead.latitude, g.lead.longitude]}
            icon={buildIcon(g.lead.rarity, g.lead.category, g.items.length, g.lead.image_url)}
            eventHandlers={{
              click: () => (g.items.length === 1 ? openCapture(g.lead) : setGroupItems(g.items)),
            }}
          />,
        ];
      }),
    [groups, zoom],
  );









  if (loading) return <LoadingScreen />;

  return (
    <main className={`w-full overflow-hidden bg-background ${embedded ? 'fixed inset-0 z-0' : 'relative h-[100dvh]'}`}>
      {/* Contrôles flottants sous l'en-tête */}
      <div className={`absolute left-0 right-0 z-20 px-4 pointer-events-none ${embedded ? 'top-[calc(env(safe-area-inset-top)+92px)]' : 'top-[max(1rem,env(safe-area-inset-top))]'}`}>
        <div className="max-w-lg mx-auto flex items-start justify-between gap-2">
          <button
            onClick={() => { hapticTap(); setShowCaptures((v) => !v); }}
            aria-pressed={showCaptures}
            className={`pointer-events-auto press flex items-center gap-1.5 rounded-full backdrop-blur-xl border shadow-card pl-3 pr-3.5 py-2 text-[12.5px] font-display font-bold transition-colors ${showCaptures ? 'bg-card/90 border-border/60 text-foreground' : 'bg-muted/90 border-border/60 text-muted-foreground'}`}
          >
            {showCaptures ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4" />}
            {t('map.controls.myCaptures', { count: captures.length })}
          </button>
          <div className="flex items-center gap-2">
          <button
            onClick={locateMe}
            className="pointer-events-auto press p-2.5 rounded-full bg-card/90 backdrop-blur-xl border border-border/60 shadow-card"
            aria-label={t('map.header.locateMe')}
          >
            <Compass className="w-5 h-5 text-foreground" />
          </button>
          </div>
        </div>
      </div>

      {/* Capsule radar au-dessus de la barre de navigation */}
      <div className={`absolute inset-x-0 z-20 px-4 pointer-events-none bottom-[calc(env(safe-area-inset-bottom)+112px)] ${rareOpen ? 'hidden' : ''}`}>
        <button
          onClick={() => { void startRareScan(); }}
          className="pointer-events-auto press mx-auto flex w-full max-w-sm items-center gap-3 rounded-full bg-card/95 backdrop-blur-xl border border-primary/30 shadow-card pl-2 pr-2 py-2"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
            <Radar className="relative w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[14px] font-display font-bold text-foreground leading-tight truncate">{t(scanHere ? 'map.controls.scanAreaTitle' : 'map.controls.scanTitle')}</span>
            <span className="block text-[11px] text-muted-foreground leading-tight truncate">{t(scanHere ? 'map.controls.scanAreaSubtitle' : 'map.controls.scanSubtitle')}</span>
          </span>
        </button>
      </div>

      {rareOpen && (
        <div ref={deckRef} className="absolute inset-x-0 bottom-0 z-30 rounded-t-[28px] border-t border-border/60 bg-background pt-3 pb-[calc(env(safe-area-inset-bottom)+96px)] shadow-card animate-in slide-in-from-bottom-6 fade-in duration-300">
          <RareRadarDeck state={rareState} items={rareItems} isPremium={isPremium} userId={session?.user?.id} selected={rareSel} onSelect={setRareSel} onClose={() => setRareOpen(false)} />
        </div>
      )}

      {/* Fullscreen map */}
      <div className="absolute inset-x-0 top-0 transition-[bottom] duration-300" style={{ bottom: rareOpen ? deckH : 0 }}>
      <MapContainer
        center={center}
        zoom={initialView.z}
        zoomControl={false}
        attributionControl={false}
        maxZoom={18}
        scrollWheelZoom
        className="h-full w-full z-0"
      >
        <FaunexBaseLayer onReady={(gl) => { glRef.current = gl; }} />

        <RecenterOnUser position={userPos} animate={animateRecenter} />
        <CenterTracker
          onMove={(c) => {
            centerRef.current = c;
            setScanHere(!userPosRef.current || c.distanceTo(L.latLng(userPosRef.current[0], userPosRef.current[1])) > 1500);
            try { localStorage.setItem('faunex.map.view', JSON.stringify({ c: [c.lat, c.lng], z: zoom })); } catch { /* ignore */ }
          }}
          onZoom={(z) => {
            setZoom(z);
            const c = centerRef.current;
            if (c) try { localStorage.setItem('faunex.map.view', JSON.stringify({ c: [c.lat, c.lng], z })); } catch { /* ignore */ }
          }}
        />
        {userPos && (
          <Marker
            position={userPos}
            icon={userIcon}
          />
        )}
        {showCaptures && !rareOpen && markers}
        {rareOpen && rareState !== 'nolocation' && <RareRadarLayer origin={rareOrigin} items={rareItems} selected={rareSel} onSelect={setRareSel} pulseKey={rarePulse} />}
        <MapResizer dep={rareOpen ? deckH : 0} />
      </MapContainer>
      </div>



      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+66px)] right-2 z-20 text-[9px] text-muted-foreground/80"
      >
        © OpenStreetMap · OpenFreeMap
      </a>

      <Sheet open={!!zone} onOpenChange={(o) => { if (!o) { zoneRequest.current?.abort(); setZone(null); setHighlight([]); } }}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto z-[1200] rounded-t-[28px] duration-500 data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)]">
          <div className="mx-auto -mt-2 mb-2 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
          <SheetHeader>
            <SheetTitle className="font-display text-left">
              {zone?.name || t(`map.zones.kind.${zone?.kind ?? 'forest'}`)}
            </SheetTitle>
          </SheetHeader>
          <p className="text-[12px] text-muted-foreground mt-1">
            {zone?.name ? `${t(`map.zones.kind.${zone.kind}`)} · ` : ''}
            {t('map.zones.observed')}
          </p>
          {!!zone?.species?.length && (() => {
            const total = zone.species.length;
            const got = zone.species.filter((s) => capturedNames.has(s.name.trim().toLowerCase())).length;
            return (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[12px] font-display font-bold">
                  <span className="text-foreground">{t('map.zones.progress', { got, total })}</span>
                  <span className="text-primary">{Math.round((got / total) * 100)} %</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(got / total) * 100}%` }} />
                </div>
              </div>
            );
          })()}
          <div className="mt-4">
            {zone?.species === null && [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-12 h-12 rounded-xl bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
            {zone?.species && (() => {
              const isGot = (n: string) => capturedNames.has(n.trim().toLowerCase());
              const groups = [
                { key: 'todo', label: t('map.zones.toFind'), items: zone.species.filter((s) => !isGot(s.name)) },
                { key: 'got', label: t('map.zones.alreadyCaptured'), items: zone.species.filter((s) => isGot(s.name)) },
              ].filter((g) => g.items.length);
              let i = 0;
              return groups.map((g) => (
                <div key={g.key} className="pt-3 first:pt-0">
                  <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                    {g.label} · {g.items.length}
                  </p>
                  {g.items.map((s) => {
                    const Icon = getBestiaryCategoryIcon(s.category || '');
                    const captured = g.key === 'got';
                    const delay = 60 * i++;
                    return (
                      <div
                        key={s.scientific_name}
                        className="flex items-center gap-3 py-2.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${captured ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground/70'}`}>
                          <Icon className="w-6 h-6" />
                          {captured && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background">
                              <Check className="w-3 h-3" strokeWidth={3.5} />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-display font-bold text-sm truncate ${captured ? 'text-foreground' : 'text-foreground/85'}`}>{speciesName(s.name)}</p>
                          <p className="text-[11px] italic text-muted-foreground truncate">{s.scientific_name}</p>
                        </div>
                        <RarityBadge rarity={s.rarity} plain className="shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
          {zone?.species && zone.species.length === 0 && (
            <p className="text-[13px] text-muted-foreground py-4 text-center">
              {zone.failed ? t('map.zones.error') : t('map.zones.empty')}
            </p>
          )}
          {!!zone?.species?.length && (
            <p className="text-[10px] text-muted-foreground/80 mt-3">{t('map.zones.source')}</p>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!groupItems} onOpenChange={(o) => !o && setGroupItems(null)}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto z-[1200]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 font-display">
              <MapPin className="w-5 h-5 text-primary" />
              {groupItems?.[0]?.location || t('map.groupSheet.defaultTitle')}
            </SheetTitle>
          </SheetHeader>
          <p className="text-[12px] text-muted-foreground mt-1">
            {t('map.groupSheet.count', { count: groupItems?.length || 0 })}
          </p>
          <div className="mt-4 space-y-2">
            {groupItems?.map((c) => (
              <button
                key={c.id}
                onClick={() => { setGroupItems(null); openCapture(c); }}
                className="w-full flex items-center gap-3 p-2 rounded-2xl border border-border bg-card text-left hover:bg-muted/50 transition-colors"
              >
                {c.image_url && (
                  <img
                    src={thumbUrl(c.image_url, 120)}
                    alt={c.animal_name}
                    loading="lazy"
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-foreground truncate">{c.animal_name}</p>
                  <p className="text-[11px] italic text-muted-foreground truncate">{c.scientific_name}</p>
                </div>
                <span
                  className="text-[10px] font-display font-bold uppercase px-2 py-1 rounded-full shrink-0"
                  style={{
                    background: `${RARITY_COLORS[c.rarity] || RARITY_COLORS.common}22`,
                    color: RARITY_COLORS[c.rarity] || RARITY_COLORS.common,
                  }}
                >
                  {RARITY_LABELS[c.rarity as Rarity] || c.rarity}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>


      <CardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onDeleted={(captureId) => {
          setCaptures((current) => current.filter((capture) => capture.id !== captureId));
          setGroupItems((current) => current?.filter((capture) => capture.id !== captureId) || null);
        }}
      />
    </main>

  );
};

// Recalcule la taille de la carte quand le plateau du scanner s'ouvre ou se ferme.
function MapResizer({ dep }: { dep: number }) {
  const map = useMap();
  useEffect(() => { const id = window.setTimeout(() => map.invalidateSize({ pan: false }), 320); return () => window.clearTimeout(id); }, [dep, map]);
  return null;
}

export default MapPage;
