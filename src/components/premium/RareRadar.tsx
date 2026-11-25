import { useEffect, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, Navigation, Sparkles, Users, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RarityBadge } from '@/components/RarityBadge';
import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';

export interface RareSighting {
  animal_name: string | null; scientific_name: string | null; category: string | null; rarity: string;
  lat: number; lng: number; distance_km: number; seen_at: string; sightings: number; locked: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'hsl(220 10% 58%)', uncommon: 'hsl(220 12% 45%)',
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
const keyOf = (s: RareSighting, i: number) => s.animal_name ?? `locked-${i}`;

const sonarIcon = L.divIcon({
  className: 'rare-sonar',
  html: '<span class="rare-sonar-sweep"></span><span class="rare-sonar-ring"></span><span class="rare-sonar-ring rare-sonar-ring--2"></span><span class="rare-sonar-ring rare-sonar-ring--3"></span>',
  iconSize: [0, 0],
});

const pinIcon = (s: RareSighting, i: number, selected: boolean, label: string, animate: boolean) => {
  const color = rarityColor(s.rarity);
  const inner = s.locked
    ? renderToStaticMarkup(<Lock color={color} strokeWidth={2.4} width={18} height={18} />)
    : (() => { const Icon = categoryLineIcon(s.category ?? ''); return renderToStaticMarkup(<Icon color={color} strokeWidth={2.2} width={22} height={22} />); })();
  return L.divIcon({
    className: 'rare-pin',
    html: `<div class="rare-pin-body${selected ? ' is-selected' : ''}${s.locked ? ' is-locked' : ''}${animate ? '' : ' is-static'}" style="--rare:${color};animation-delay:${500 + i * 140}ms">
      <span class="rare-pin-halo"></span>
      <span class="rare-pin-disc">${inner}</span>
      <span class="rare-pin-age">${label}</span></div>`,
    iconSize: [52, 64],
    iconAnchor: [26, 30],
  });
};

/** Couche carte : onde sonar une seule fois, puis pastilles fixes (pas de ré-animation au déplacement). */
export function RareRadarLayer({ origin, items, selected, onSelect, pulseKey }: {
  origin: [number, number] | null; items: RareSighting[]; selected: number; onSelect: (i: number) => void; pulseKey: number;
}) {
  const map = useMap();
  const ago = useAgo();
  const fitted = useRef(-1);
  const shown = useRef<{ key: number; set: Set<string> }>({ key: -1, set: new Set() });
  if (shown.current.key !== pulseKey) shown.current = { key: pulseKey, set: new Set() };
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
  // Icônes figées : recréées seulement quand la sélection ou le scan change.
  const icons = useMemo(() => items.map((s, i) => {
    const k = keyOf(s, i);
    const first = !shown.current.set.has(k);
    shown.current.set.add(k);
    return pinIcon(s, i, i === selected, ago(s.seen_at), first);
  }), [items, selected, pulseKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sonar = useMemo(() => <Marker key={`sonar-${pulseKey}`} position={origin ?? [0, 0]} icon={sonarIcon} interactive={false} />, [pulseKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!origin) return null;
  return (
    <>
      {sonar}
      {items.map((s, i) => (
        <span key={`${keyOf(s, i)}-${pulseKey}`}>
          {i === selected && !s.locked && <Circle center={[s.lat, s.lng]} radius={600} pathOptions={{ color: rarityColor(s.rarity), weight: 1.5, dashArray: '4 6', fillOpacity: 0.08 }} />}
          <Marker position={[s.lat, s.lng]} icon={icons[i]} zIndexOffset={i === selected ? 1000 : 0} eventHandlers={{ click: () => onSelect(i) }} />
        </span>
      ))}
    </>
  );
}

/** Bandeau du bas : espèces les plus vues autour, Premium tout révélé, gratuit en silhouettes. */
export function RareRadarDeck({ state, items, isPremium, selected, onSelect, onClose, onPotential }: {
  state: 'scanning' | 'ready' | 'nolocation'; items: RareSighting[]; isPremium: boolean; selected: number;
  onSelect: (i: number) => void; onClose: () => void; onPotential: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ago = useAgo();
  const { speciesName } = useSpeciesName();
  const track = useRef<HTMLDivElement>(null);
  const lockedCount = items.filter((s) => s.locked).length;
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
      if (best !== selected && best < items.length) onSelect(best);
    }, 120); };
  }, [selected, onSelect, items.length]);

  const header = (
    <div className="mx-auto mb-2 flex max-w-lg items-center justify-between px-4">
      <span className="flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 text-[12px] font-display font-bold text-foreground shadow-card backdrop-blur-xl">
        <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-primary" /><span className="relative h-2 w-2 rounded-full bg-primary" /></span>
        {state === 'scanning' ? t('premiumFeatures.radar.scanning') : t('premiumFeatures.radar.found', { count: items.length })}
      </span>
      <button onClick={onClose} aria-label={t('common.close')} className="press pointer-events-auto rounded-full bg-card/95 p-2 shadow-card backdrop-blur-xl"><X className="h-4 w-4" /></button>
    </div>
  );

  const potentialCard = (
    <button key="potential" type="button" onClick={onPotential}
      className="mission-plate flex w-[80vw] max-w-[320px] shrink-0 snap-center flex-col items-center justify-center rounded-3xl p-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary"><Sparkles className="h-6 w-6" /></span>
      <p className="mt-2 font-display text-[15px] font-bold text-foreground">{t('premiumFeatures.radar.potentialTitle')}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{t('premiumFeatures.radar.potentialBody')}</p>
    </button>
  );

  let body: React.ReactNode;
  if (state === 'scanning') body = <div className="mission-plate mx-auto flex max-w-sm items-center justify-center gap-2 rounded-3xl p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('premiumFeatures.radar.scanning')}</div>;
  else if (state === 'nolocation') body = <div className="mission-plate mx-auto max-w-sm rounded-3xl p-5 text-center text-sm text-muted-foreground">{t('premiumFeatures.radar.noLocation')}</div>;
  else body = (
    <>
      <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[10vw] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((s, i) => {
          const color = rarityColor(s.rarity);
          const Icon = categoryLineIcon(s.category ?? '');
          return (
            <button key={keyOf(s, i)} type="button" onClick={() => (s.locked ? navigate('/premium') : onSelect(i))}
              className={`mission-plate relative w-[80vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-3xl p-4 text-left transition-transform duration-300 ${i === selected ? 'scale-100' : 'scale-[0.94] opacity-80'}`}>
              <div className={s.locked ? 'pointer-events-none select-none blur-[6px]' : ''} aria-hidden={s.locked}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-card" style={{ borderColor: color, color }}><Icon className="h-6 w-6" strokeWidth={2} /></span>
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10.5px] font-display font-bold text-primary"><Users className="h-3 w-3" />{t('premiumFeatures.radar.seenBy', { count: s.sightings })}</span>
                    <p className="mt-1 truncate font-display text-[16px] font-bold leading-tight text-foreground">{s.locked ? '••••••••' : speciesName(s.animal_name ?? '')}</p>
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
              </div>
              {s.locked && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-card/40 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber/15 text-amber"><Crown className="h-5 w-5" /></span>
                  <span className="font-display text-[14px] font-bold text-foreground">{t('premiumFeatures.radar.lockedCard')}</span>
                </span>
              )}
            </button>
          );
        })}
        {potentialCard}
      </div>
      {!isPremium && lockedCount > 0 && (
        <div className="mx-auto mt-2 max-w-sm px-4">
          <Button onClick={() => navigate('/premium')} className="game-button h-11 w-full font-display"><Crown className="mr-1.5 h-4 w-4" />{t('premiumFeatures.radar.unlockMore', { count: lockedCount })}</Button>
        </div>
      )}
    </>
  );
  return <div className="pointer-events-auto">{header}{body}</div>;
}
