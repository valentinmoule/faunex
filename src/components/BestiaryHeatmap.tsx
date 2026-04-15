import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RARITY_LABELS, type Rarity } from '@/data/mockData';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

interface CapturePoint {
  lat: number;
  lng: number;
  animal_name: string;
  rarity: string;
  location: string;
}

interface ZoneCluster {
  location: string;
  count: number;
  species: { name: string; rarity: string }[];
  lat: number;
  lng: number;
}

// Extend L namespace for heat
declare module 'leaflet' {
  function heatLayer(latlngs: Array<[number, number, number?]>, options?: any): any;
}

const rarityWeight: Record<string, number> = {
  common: 0.3,
  rare: 0.6,
  epic: 0.85,
  mythic: 1.0,
};

const rarityColor: Record<string, string> = {
  common: 'hsl(var(--rarity-common))',
  rare: 'hsl(var(--rarity-rare))',
  epic: 'hsl(var(--rarity-epic))',
  mythic: 'hsl(var(--rarity-mythic))',
};

const rarityBadgeClass: Record<string, string> = {
  common: 'bg-rarity-common/15 text-rarity-common',
  rare: 'bg-rarity-rare/15 text-rarity-rare',
  epic: 'bg-rarity-epic/15 text-rarity-epic',
  mythic: 'bg-rarity-mythic/15 text-rarity-mythic',
};

const BestiaryHeatmap = () => {
  const { session } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CapturePoint[]>([]);
  const [zones, setZones] = useState<ZoneCluster[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneCluster | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [capturedNames, setCapturedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch all approved captures with coordinates
      let allCaptures: CapturePoint[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('captures')
          .select('latitude, longitude, animal_name, rarity, location')
          .eq('status', 'approved')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (!data || data.length === 0) break;
        allCaptures = allCaptures.concat(
          data.map((c) => ({
            lat: c.latitude!,
            lng: c.longitude!,
            animal_name: c.animal_name,
            rarity: c.rarity,
            location: c.location || 'Zone inconnue',
          }))
        );
        if (data.length < pageSize) break;
        page++;
      }

      // Fetch user's captures for "captured" status
      const { data: userCaptures } = await supabase
        .from('captures')
        .select('animal_name')
        .eq('user_id', session.user.id)
        .eq('status', 'approved');

      setCapturedNames(new Set((userCaptures || []).map((c) => c.animal_name.toLowerCase())));

      setPoints(allCaptures);

      // Cluster by location name
      const locationMap = new Map<string, { points: CapturePoint[]; species: Map<string, string> }>();
      allCaptures.forEach((p) => {
        const key = p.location.trim().toLowerCase();
        if (!locationMap.has(key)) {
          locationMap.set(key, { points: [], species: new Map() });
        }
        const entry = locationMap.get(key)!;
        entry.points.push(p);
        if (!entry.species.has(p.animal_name.toLowerCase())) {
          entry.species.set(p.animal_name.toLowerCase(), p.rarity);
        }
      });

      const zoneClusters: ZoneCluster[] = [];
      locationMap.forEach((entry, key) => {
        const avgLat = entry.points.reduce((s, p) => s + p.lat, 0) / entry.points.length;
        const avgLng = entry.points.reduce((s, p) => s + p.lng, 0) / entry.points.length;
        zoneClusters.push({
          location: entry.points[0].location,
          count: entry.points.length,
          species: Array.from(entry.species.entries()).map(([name, rarity]) => ({ name, rarity })),
          lat: avgLat,
          lng: avgLng,
        });
      });

      // Sort by count desc
      zoneClusters.sort((a, b) => b.count - a.count);
      setZones(zoneClusters);
      setLoading(false);
    };

    fetchData();
  }, [session]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || loading || points.length === 0) return;
    if (leafletMap.current) return; // already initialized

    const map = L.map(mapRef.current, {
      center: [46.6, 2.3], // France center
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add heatmap layer
    const heatPoints: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lng,
      rarityWeight[p.rarity] || 0.3,
    ]);

    const heat = (L as any).heatLayer(heatPoints, {
      radius: 25,
      blur: 20,
      maxZoom: 12,
      max: 1.0,
      gradient: {
        0.2: '#22c55e',
        0.4: '#3b82f6',
        0.6: '#8b5cf6',
        0.8: '#f59e0b',
        1.0: '#ef4444',
      },
    }).addTo(map);

    heatLayerRef.current = heat;
    leafletMap.current = map;

    // Fit bounds to points
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      // Cleanup on unmount
    };
  }, [loading, points]);

  const flyToZone = (zone: ZoneCluster) => {
    setSelectedZone(zone);
    if (leafletMap.current) {
      leafletMap.current.flyTo([zone.lat, zone.lng], 10, { duration: 1 });
    }
  };

  const filteredZones = searchQuery
    ? zones.filter(
        (z) =>
          z.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          z.species.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : zones;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
        <span className="text-sm text-muted-foreground font-display">Chargement de la carte…</span>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="text-center py-16">
        <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-display text-sm">Aucune observation géolocalisée</p>
        <p className="text-muted-foreground/60 font-display text-xs mt-1">
          Les captures avec localisation apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
        <div ref={mapRef} className="w-full h-[280px]" />
        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50 flex items-center gap-2 text-[9px] font-display">
          <span className="text-muted-foreground">Densité :</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary/60" /> Faible
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rarity-epic/60" /> Moyenne
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive/60" /> Élevée
          </span>
        </div>
      </div>

      {/* Search zones */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un lieu ou une espèce…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
        />
      </div>

      {/* Zone list */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-display">
          {filteredZones.length} zone{filteredZones.length > 1 ? 's' : ''} d'observation
        </p>
        {filteredZones.slice(0, 20).map((zone, i) => (
          <button
            key={i}
            onClick={() => flyToZone(zone)}
            className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${
              selectedZone?.location === zone.location
                ? 'bg-primary/5 border-primary/30'
                : 'bg-card border-border hover:bg-muted/50'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-sm text-foreground truncate">
                  {zone.location}
                </h3>
                <span className="text-[10px] text-muted-foreground font-display shrink-0">
                  {zone.count} obs.
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {zone.species.slice(0, 5).map((s, j) => {
                  const isCaptured = capturedNames.has(s.name.toLowerCase());
                  return (
                    <span
                      key={j}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-display font-semibold ${
                        isCaptured
                          ? 'bg-primary/10 text-primary'
                          : rarityBadgeClass[s.rarity] || 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCaptured ? '✓ ' : ''}
                      {isCaptured
                        ? s.name.charAt(0).toUpperCase() + s.name.slice(1)
                        : s.name.charAt(0).toUpperCase() + s.name.slice(1)}
                    </span>
                  );
                })}
                {zone.species.length > 5 && (
                  <span className="text-[9px] text-muted-foreground font-display">
                    +{zone.species.length - 5}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BestiaryHeatmap;
