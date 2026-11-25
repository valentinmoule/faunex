import { useEffect, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RarityBadge } from '@/components/RarityBadge';
import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';

export interface RareSighting {
  animal_name: string; scientific_name: string | null; category: string | null; rarity: string;
  lat: number; lng: number; distance_km: number; seen_at: string;
}

const RARITY_COLORS: Record<string, string> = {
  rare: 'hsl(210 92% 50%)', very_rare: 'hsl(265 72% 55%)', ultra_rare: 'hsl(220 18% 62%)',
  illustration_rare: 'hsl(43 95% 52%)', special_rare: 'hsl(33 96% 50%)', hyper_rare: 'hsl(24 98% 50%)',
};
export const rarityColor = (r: string) => RARITY_COLORS[r] ?? 'hsl(152 62% 36%)';

export function useAgo() {
  const { t } = useTranslation();
  return (iso: string) => {
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return t('premiumFeatures.radar.minutesAgo', { m: mins });
    if (mins < 60 * 24) return t('premiumFeatures.radar.hoursAgo', { h: Math.round(mins / 60) });
    return t('premiumFeatures.radar.daysAgo', { count: Math.round(mins / 1440) });
  };
}
const fmtKm = (km: number) => (km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`);

const sonarIcon = L.divIcon({
  className: 'rare-sonar',
  html: '<span class="rare-sonar-sweep"></span><span class="rare-sonar-ring"></span><span class="rare-sonar-ring rare-sonar-ring--2"></span><span class="rare-sonar-ring rare-sonar-ring--3"></span>',
  iconSize: [0, 0],
});

const pinIcon = (s: RareSighting, i: number, selected: boolean, age: string) => {
  const Icon = categoryLineIcon(s.category ?? '');
  const color = rarityColor(s.rarity);
  return L.divIcon({
    className: 'rare-pin',
    html: `<div class="rare-pin-body${selected ? ' is-selected' : ''}" style="--rare:${color};animation-delay:${500 + i * 140}ms">
      <span class="rare-pin-halo"></span>
      <span class="rare-pin-disc">${renderToStaticMarkup(<Icon color={color} strokeWidth={2.2} width={22} height={22} />)}</span>
      <span class="rare-pin-age">${age}</span></div>`,
    iconSize: [52, 64],
    iconAnchor: [26, 30],
  });
};

/** Couche carte : onde sonar depuis la position, puis pastilles des espèces repérées. */
export function RareRadarLayer({ origin, items, selected, onSelect, pulseKey }: {
  origin: [number, number] | null; items: RareSighting[]; selected: number; onSelect: (i: number) => void; pulseKey: number;
}) {
  const map = useMap();
  const ago = useAgo();
  const fitted = useRef(-1);
  useEffect(() => {
    if (!origin || fitted.current === pulseKey) return;
    fitted.current = pulseKey;
    const pts = items.map((s) => L.latLng(s.lat, s.lng));
    if (pts.length) map.flyToBounds(L.latLngBounds([L.latLng(origin[0], origin[1]), ...pts]).pad(0.25), { duration: 1.1, maxZoom: 14, paddingBottomRight: [0, 160] });
    else map.flyTo(origin, Math.min(map.getZoom(), 13), { duration: 0.8 });
  }, [origin, items, pulseKey, map]);
  useEffect(() => {
    const s = items[selected];
    if (s && fitted.current === pulseKey) map.panTo([s.lat, s.lng], { animate: true, duration: 0.6 });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!origin) return null;
  return (
    <>
      <Marker key={`sonar-${pulseKey}`} position={origin} icon={sonarIcon} interactive={false} />
      {items.map((s, i) => (
        <span key={`${s.animal_name}-${pulseKey}`}>
          {i === selected && <Circle center={[s.lat, s.lng]} radius={600} pathOptions={{ color: rarityColor(s.rarity), weight: 1.5, dashArray: '4 6', fillOpacity: 0.08 }} />}
          <Marker position={[s.lat, s.lng]} icon={pinIcon(s, i, i === selected, ago(s.seen_at))} zIndexOffset={i === selected ? 1000 : 0} eventHandlers={{ click: () => onSelect(i) }} />
        </span>
      ))}
    </>
  );
}

/** Bandeau du bas : cartes glissables des espèces repérées. */
export function RareRadarDeck({ state, items, isPremium, selected, onSelect, onClose }: {
  state: 'scanning' | 'ready' | 'nolocation'; items: RareSighting[]; isPremium: boolean; selected: number;
  onSelect: (i: number) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ago = useAgo();
  const { speciesName } = useSpeciesName();
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected]);
  const onScroll = useMemo(() => {
    let to: number | undefined;
    return () => { window.clearTimeout(to); to = window.setTimeout(() => {
      const el = track.current; if (!el) return;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0, d = Infinity;
      Array.from(el.children).forEach((c, i) => { const h = c as HTMLElement; const dd = Math.abs(h.offsetLeft + h.offsetWidth / 2 - mid); if (dd < d) { d = dd; best = i; } });
      if (best !== selected) onSelect(best);
    }, 120); };
  }, [selected, onSelect]);

  const header = (
    <div className="mx-auto mb-2 flex max-w-lg items-center justify-between px-4">
      <span className="flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 text-[12px] font-display font-bold text-foreground shadow-card backdrop-blur-xl">
        <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-amber" /><span className="relative h-2 w-2 rounded-full bg-amber" /></span>
        {state === 'scanning' ? t('premiumFeatures.radar.scanning') : isPremium ? t('premiumFeatures.radar.found', { count: items.length }) : t('premiumFeatures.radar.title')}
      </span>
      <button onClick={onClose} aria-label={t('common.close')} className="press pointer-events-auto rounded-full bg-card/95 p-2 shadow-card backdrop-blur-xl"><X className="h-4 w-4" /></button>
    </div>
  );

  let body: React.ReactNode;
  if (state === 'scanning') body = <div className="mission-plate mx-auto flex max-w-sm items-center justify-center gap-2 rounded-3xl p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('premiumFeatures.radar.scanning')}</div>;
  else if (!isPremium) body = (
    <div className="mission-plate mx-auto max-w-sm rounded-3xl p-5 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber/15 text-amber"><Crown className="h-6 w-6" /></span>
      <p className="mt-2 font-display text-lg font-bold">{t('premiumFeatures.radar.lockedTitle')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('premiumFeatures.radar.lockedBody')}</p>
      <Button onClick={() => navigate('/premium')} className="game-button mt-4 h-12 w-full font-display">{t('premiumFeatures.radar.cta')}</Button>
    </div>
  );
  else if (state === 'nolocation') body = <div className="mission-plate mx-auto max-w-sm rounded-3xl p-5 text-center text-sm text-muted-foreground">{t('premiumFeatures.radar.noLocation')}</div>;
  else if (items.length === 0) body = <div className="mission-plate mx-auto max-w-sm rounded-3xl p-5 text-center text-sm text-muted-foreground">{t('premiumFeatures.radar.empty')}</div>;
  else body = (
    <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[10vw] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((s, i) => {
        const Icon = categoryLineIcon(s.category ?? '');
        const color = rarityColor(s.rarity);
        return (
          <button key={s.animal_name} type="button" onClick={() => onSelect(i)}
            className={`mission-plate w-[80vw] max-w-[320px] shrink-0 snap-center rounded-3xl p-4 text-left transition-transform duration-300 ${i === selected ? 'scale-100' : 'scale-[0.94] opacity-80'}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-card" style={{ borderColor: color, color }}><Icon className="h-6 w-6" strokeWidth={2} /></span>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-amber/15 px-2 py-0.5 text-[10.5px] font-display font-bold text-amber">{t('premiumFeatures.radar.missing')}</span>
                <p className="mt-1 truncate font-display text-[16px] font-bold leading-tight text-foreground">{speciesName(s.animal_name)}</p>
                <RarityBadge rarity={s.rarity} plain />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-primary/10 px-3 py-2">
                <p className="flex items-center gap-1 text-[10.5px] font-display font-bold uppercase tracking-wide text-primary"><Navigation className="h-3 w-3" />{t('premiumFeatures.radar.fromYou')}</p>
                <p className="font-display text-xl font-black tabular-nums text-foreground">{fmtKm(s.distance_km)}</p>
              </div>
              <div className="rounded-2xl bg-amber/12 px-3 py-2">
                <p className="text-[10.5px] font-display font-bold uppercase tracking-wide text-amber">{t('premiumFeatures.radar.seen')}</p>
                <p className="font-display text-xl font-black text-foreground">{ago(s.seen_at)}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
  return <div className="pointer-events-auto">{header}{body}</div>;
}
