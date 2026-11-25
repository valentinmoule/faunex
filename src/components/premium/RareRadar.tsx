import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, Sparkles, Users, X, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RarityBadge } from '@/components/RarityBadge';
import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';
import { supabase } from '@/integrations/supabase/client';
import { gridThumbUrl } from '@/lib/imageUrl';
import { normalizeSpeciesSearch } from '@/lib/bestiary';

import type { RadarItem } from '@/lib/radarSources';

export type RareSighting = RadarItem;
const onMap = (s: RareSighting) => s.kind !== 'potential' && Number.isFinite(s.lat) && Number.isFinite(s.lng);

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
    // Recadre au lancement du scan puis une fois les résultats arrivés.
    const fitKey = pulseKey * 1000 + items.length;
    if (!origin || fitted.current === fitKey) return;
    fitted.current = fitKey;
    const pts = items.filter(onMap).map((s) => L.latLng(s.lat, s.lng));
    if (pts.length) map.flyToBounds(L.latLngBounds([L.latLng(origin[0], origin[1]), ...pts]).pad(0.25), { duration: 1.1, maxZoom: 14, paddingBottomRight: [0, 160] });
    else map.flyTo(origin, Math.min(map.getZoom(), 13), { duration: 0.8 });
  }, [origin, items, pulseKey, map]);
  useEffect(() => {
    const s = items[selected];
    if (s && onMap(s) && fitted.current === pulseKey * 1000 + items.length) map.panTo([s.lat, s.lng], { animate: true, duration: 0.6 });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  // Icônes figées : recréées seulement quand la sélection ou le scan change.
  const icons = useMemo(() => items.map((s, i) => {
    const k = keyOf(s, i);
    const first = !shown.current.set.has(k);
    shown.current.set.add(k);
    return onMap(s) ? pinIcon(s, i, i === selected, ago(s.seen_at), first) : null;
  }), [items, selected, pulseKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sonar = useMemo(() => <Marker key={`sonar-${pulseKey}`} position={origin ?? [0, 0]} icon={sonarIcon} interactive={false} />, [pulseKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!origin) return null;
  return (
    <>
      {sonar}
      {items.map((s, i) => icons[i] && (
        <span key={`${keyOf(s, i)}-${pulseKey}`}>
          {i === selected && !s.locked && <Circle center={[s.lat, s.lng]} radius={600} pathOptions={{ color: rarityColor(s.rarity), weight: 1.5, dashArray: '4 6', fillOpacity: 0.08 }} />}
          <Marker position={[s.lat, s.lng]} icon={icons[i]!} zIndexOffset={i === selected ? 1000 : 0} eventHandlers={{ click: () => onSelect(i) }} />
        </span>
      ))}
    </>
  );
}

/** Bandeau du bas : espèces les plus vues autour, Premium tout révélé, gratuit en silhouettes. */
export function RareRadarDeck({ state, items, isPremium, userId, selected, onSelect, onClose }: {
  state: 'scanning' | 'ready' | 'nolocation'; items: RareSighting[]; isPremium: boolean; userId?: string; selected: number;
  onSelect: (i: number) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ago = useAgo();
  const { speciesName } = useSpeciesName();
  const track = useRef<HTMLDivElement>(null);
  const lockedCount = items.filter((s) => s.locked).length;
  // Espèces déjà capturées : la carte montre ma photo, comme dans le Bestiaire.
  const [owned, setOwned] = useState<Record<string, string>>({});
  useEffect(() => {
    const names = items.map((s) => s.animal_name).filter((n): n is string => !!n);
    if (!userId || names.length === 0) { setOwned({}); return; }
    let live = true;
    void supabase.from('captures').select('animal_name, image_url, created_at').eq('user_id', userId).eq('status', 'approved')
      .in('animal_name', names).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!live) return;
        const m: Record<string, string> = {};
        (data ?? []).forEach((c) => { const k = normalizeSpeciesSearch(c.animal_name ?? ''); if (k && c.image_url && !m[k]) m[k] = c.image_url; });
        setOwned(m);
      });
    return () => { live = false; };
  }, [items, userId]);
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

  let body: React.ReactNode;
  if (state === 'scanning') body = <div className="mission-plate mx-auto flex max-w-sm items-center justify-center gap-2 rounded-3xl p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('premiumFeatures.radar.scanning')}</div>;
  else if (state === 'nolocation') body = <div className="mission-plate mx-auto max-w-sm rounded-3xl p-5 text-center text-sm text-muted-foreground">{t('premiumFeatures.radar.noLocation')}</div>;
  else if (items.length === 0) body = <div className="mission-plate mx-auto max-w-sm rounded-3xl p-5 text-center text-sm text-muted-foreground">{t('premiumFeatures.radar.emptyAll')}</div>;
  else body = (
    <>
      <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[31vw] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((s, i) => {
          const color = rarityColor(s.rarity);
          const potential = s.kind === 'potential';
          const open = () => {
            if (s.locked) { navigate('/premium'); return; }
            if (i !== selected) { onSelect(i); return; }
            if (s.animal_name) navigate(`/home?tab=categories&q=${encodeURIComponent(s.animal_name)}`);
          };
          const Icon = categoryLineIcon(s.category ?? '');
          const photo = !s.locked && s.animal_name ? owned[normalizeSpeciesSearch(s.animal_name)] : undefined;
          const meta = s.locked ? t('premiumFeatures.radar.lockedCard')
            : potential ? (s.tip || t('premiumFeatures.radar.potentialBody'))
            : `${fmtKm(s.distance_km)} · ${ago(s.seen_at)}`;
          return (
            <button key={`${s.kind}-${keyOf(s, i)}`} type="button" onClick={open}
              className={`relative w-[38vw] max-w-[150px] shrink-0 snap-center text-left transition-transform duration-300 ${i === selected ? 'scale-100' : 'scale-[0.92] opacity-80'}`}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-[3px] bg-card shadow-card" style={{ borderColor: color }}>
                {photo
                  ? <img src={gridThumbUrl(photo)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  : <div className={`flex h-full w-full items-center justify-center ${s.locked ? 'blur-[5px]' : ''}`} style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                      <Icon className="h-12 w-12 opacity-70" strokeWidth={1.6} />
                    </div>}
                {s.locked && <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-card/10 via-card/40 to-card/70 backdrop-blur-[2px]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber to-amber/70 text-primary-foreground shadow-card ring-2 ring-card"><Crown className="h-5 w-5" strokeWidth={2.2} /></span><span className="rounded-full bg-card/90 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-amber shadow-sm">Premium</span></span>}
                {photo && <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                <span className="absolute right-1.5 top-1.5 z-10 drop-shadow-sm"><RarityBadge rarity={s.rarity} plain /></span>
              </div>
              <p className="mt-1.5 truncate font-display text-[13.5px] font-bold leading-tight text-foreground">{s.locked ? <span className="block h-3.5 w-4/5 rounded-full bg-muted" /> : speciesName(s.animal_name ?? '')}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-display font-semibold">
                {s.locked ? <span className="flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" />{t('premiumFeatures.radar.lockedCard')}</span>
                  : potential ? <span className="flex items-center gap-1 text-amber"><Sparkles className="h-3 w-3 shrink-0" />{t('premiumFeatures.radar.potentialTag')}</span>
                  : <span className="flex items-center gap-1 text-primary"><Users className="h-3 w-3 shrink-0" />{t('premiumFeatures.radar.seenBy', { count: s.sightings })}</span>}
              </p>
              {!s.locked && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{meta}</p>}
            </button>
          );
        })}
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
