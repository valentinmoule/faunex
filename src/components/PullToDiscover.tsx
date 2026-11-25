import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Radar, Check, Lightbulb } from 'lucide-react';
import { thumbUrl } from '@/lib/imageUrl';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNearbyQuota, DAILY_NEARBY_LIMIT } from '@/hooks/useNearbyQuota';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getCurrentPosition } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { useSwipeDownClose } from '@/lib/useSwipeDownClose';
import { RarityBadge } from '@/components/RarityBadge';
import { useTranslation } from 'react-i18next';
import { normalizeSpeciesSearch, getCategoryIcon } from '@/lib/bestiary';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';

const ENABLED_ROUTES = ['/home', '/explorers', '/profile'];

const THRESHOLD = 88;
const MAX_PULL = 150;

interface DiscoveredAnimal {
  name: string;
  scientific_name: string;
  category: string;
  rarity: string;
  description: string;
  tip: string;
}

const isAtTop = (target: EventTarget | null) => {
  if (window.scrollY > 4) return false;
  let el = target as HTMLElement | null;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const scrollable = /(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 2;
    if (scrollable && el.scrollTop > 4) return false;
    el = el.parentElement;
  }
  return true;
};

const PullToDiscover = () => {
  const { t } = useTranslation();
  const { speciesName } = useSpeciesName();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useSearchParams()[0];
  // Sur l'onglet Cartes (/home?tab=map), le geste capture les touchers et
  // empêche de déplacer la carte : on le désactive complètement.
  const enabled =
    ENABLED_ROUTES.includes(location.pathname) &&
    !!session?.user &&
    !(location.pathname === '/home' && searchParams.get('tab') === 'map');
  const { remaining, unlimited, exhausted, consume } = useNearbyQuota(session?.user?.id);

  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ location: string; animals: DiscoveredAnimal[] } | null>(null);
  const [status, setStatus] = useState<Record<string, { mine: boolean; recent: number; photo?: string }>>({});

  // Statut personnel + observations communautaires des 15 derniers jours.
  useEffect(() => {
    const uid = session?.user?.id;
    const names = (result?.animals || []).map((a) => a.name).filter(Boolean);
    if (!uid || names.length === 0) { setStatus({}); return; }
    let cancelled = false;
    const since = new Date(Date.now() - 15 * 86400000).toISOString();
    Promise.all([
      supabase.from('captures').select('animal_name,scientific_name').eq('user_id', uid).eq('status', 'approved').limit(5000),
      supabase.from('captures').select('animal_name,user_id,image_url,created_at').eq('status', 'approved').eq('shared', true)
        .in('animal_name', names).gte('created_at', since).order('created_at', { ascending: false }).limit(200),
    ]).then(([mine, recent]) => {
      if (cancelled) return;
      const next: Record<string, { mine: boolean; recent: number; photo?: string }> = {};
      names.forEach((n) => { next[n.toLowerCase()] = { mine: false, recent: 0 }; });
      // Comparaison tolérante (accents, apostrophes, casse) sur le nom commun ou scientifique.
      const myNames = new Set<string>();
      const mySci = new Set<string>();
      (mine.data || []).forEach((r: any) => {
        if (r.animal_name) myNames.add(normalizeSpeciesSearch(r.animal_name));
        if (r.scientific_name) mySci.add(normalizeSpeciesSearch(r.scientific_name));
      });
      (result?.animals || []).forEach((a) => {
        const k = a.name?.toLowerCase();
        if (!k || !next[k]) return;
        if (myNames.has(normalizeSpeciesSearch(a.name)) || (a.scientific_name && mySci.has(normalizeSpeciesSearch(a.scientific_name)))) next[k].mine = true;
      });
      const seen = new Map<string, Set<string>>();
      (recent.data || []).forEach((r: any) => {
        const k = r.animal_name?.toLowerCase();
        if (!next[k]) return;
        if (!next[k].photo && r.image_url) next[k].photo = r.image_url;
        if (r.user_id === uid) return;
        const set = seen.get(k) || new Set<string>();
        set.add(r.user_id); seen.set(k, set);
        next[k].recent = set.size;
      });
      setStatus(next);
    });
    return () => { cancelled = true; };
  }, [result, session?.user?.id]);

  const startY = useRef(0);
  const startX = useRef(0);
  const active = useRef(false);
  const locked = useRef(false);
  const pullRef = useRef(0);
  pullRef.current = pull;

  const closeSheet = useCallback(() => setOpen(false), []);
  const swipeClose = useSwipeDownClose(closeSheet);

  const runDiscovery = useCallback(async (target?: { latitude: number; longitude: number }) => {
    if (!target && !('geolocation' in navigator)) {
      toast.error(t('map.pull.geoUnavailable'));
      return;
    }
    if (exhausted) {
      toast.error(t('map.pull.limitReachedTitle'), {
        description: t('map.pull.limitReachedDescription'),
        action: { label: t('map.pull.premiumAction'), onClick: () => navigate('/premium') },
      });
      return;
    }
    const allowed = await consume();
    window.dispatchEvent(new Event('faunex:nearby-quota'));
    if (!allowed) {
      toast.error(t('map.pull.limitReachedTitle'), {
        description: t('map.pull.limitReachedDescription'),
        action: { label: t('map.pull.premiumAction'), onClick: () => navigate('/premium') },
      });
      return;
    }
    setLoading(true);
    if ('vibrate' in navigator) navigator.vibrate?.(18);
    const search = async (pos: { coords: { latitude: number; longitude: number } }) => {
        try {
          const { data, error } = await supabase.functions.invoke('nearby-animals', {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          });
          if (error) throw error;
          setResult({
            location: (data as any)?.location_name || t('map.pull.defaultLocation'),
            animals: (data as any)?.animals || [],
          });
          setOpen(true);
        } catch (e) {
          console.error(e);
          toast.error(t('map.pull.searchErrorToast'));
        } finally {
          setLoading(false);
        }
    };
    if (target) { void search({ coords: target }); return; }
    void getCurrentPosition(
      search,
      () => {
        setLoading(false);
        toast.error(t('map.pull.geoPositionError'));
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [consume, exhausted, navigate]);

  useEffect(() => {
    if (!enabled) {
      setPull(0);
      return;
    }

    const onStart = (e: TouchEvent) => {
      if (loading || open || e.touches.length !== 1) return;
      // Une modal / bottom sheet est ouverte : ne jamais déclencher le pull-to-discover
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      if (!isAtTop(e.target)) return;
      active.current = true;
      locked.current = false;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
    };

    const onMove = (e: TouchEvent) => {
      if (!active.current) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) {
        active.current = false;
        setDragging(false);
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - startX.current;
      if (!locked.current) {
        if (dy < 10 || Math.abs(dx) > Math.abs(dy)) {
          if (Math.abs(dx) > 12 || dy < -6) active.current = false;
          return;
        }
        locked.current = true;
        setDragging(true);
      }
      // On garde la main sur le geste (utile au-dessus de la carte Leaflet)
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      const eased = Math.min(MAX_PULL, dy * 0.55);
      setPull(eased);
    };

    const onEnd = () => {
      if (!active.current) return;
      active.current = false;
      setDragging(false);
      const reached = pullRef.current >= THRESHOLD;
      setPull(0);
      if (reached && locked.current) runDiscovery();
      locked.current = false;
    };

    window.addEventListener('touchstart', onStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onMove, { capture: true, passive: false });
    window.addEventListener('touchend', onEnd, { capture: true, passive: true });
    window.addEventListener('touchcancel', onEnd, { capture: true, passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart, { capture: true } as any);
      window.removeEventListener('touchmove', onMove, { capture: true } as any);
      window.removeEventListener('touchend', onEnd, { capture: true } as any);
      window.removeEventListener('touchcancel', onEnd, { capture: true } as any);
    };
  }, [enabled, loading, open, runDiscovery]);

  // Le bouton « Autour de moi » du Terrain lance la même exploration.
  useEffect(() => {
    if (!session?.user) return;
    const onRequest = (e: Event) => { if (!loading) void runDiscovery((e as CustomEvent).detail); };
    window.addEventListener('faunex:discover-nearby', onRequest);
    return () => window.removeEventListener('faunex:discover-nearby', onRequest);
  }, [session?.user, loading, runDiscovery]);

  const progress = Math.min(1, pull / THRESHOLD);
  const ready = progress >= 1;
  const visible = pull > 2 || loading;

  if (!session?.user) return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[1400] flex justify-center pointer-events-none"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 0.5rem)',
          transform: `translate3d(0, ${loading ? 0 : Math.min(pull, MAX_PULL) - 8}px, 0)`,
          opacity: visible ? 1 : 0,
          transition: dragging ? 'none' : 'transform 320ms cubic-bezier(0.22,1,0.36,1), opacity 220ms ease',
        }}
        aria-hidden={!visible}
      >
        <div
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-card/90 backdrop-blur-xl border shadow-card',
            ready || loading ? 'border-primary/50' : 'border-border/60',
          )}
          style={{ transform: `scale(${0.86 + 0.14 * progress})` }}
        >
          <span className="relative w-7 h-7 flex items-center justify-center">
            <span
              className="absolute inset-0 rounded-full bg-primary/12"
              style={{ transform: `scale(${0.6 + 0.4 * progress})` }}
            />
            {loading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Radar
                className={cn('w-4 h-4 text-primary transition-transform', ready && 'scale-110')}
                style={{ transform: `rotate(${progress * 180}deg)` }}
              />
            )}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-display font-bold text-foreground leading-none">
              {loading
                ? t('map.pull.statusExploring')
                : exhausted
                  ? t('map.pull.statusLimitReached')
                  : ready
                    ? t('map.pull.statusReady')
                    : t('map.pull.statusPull')}
            </span>
            {!loading && !unlimited && remaining !== null && (
              <span className="text-[10px] font-medium text-muted-foreground leading-none">
                {exhausted
                  ? t('map.pull.remainingLimitReached')
                  : t('map.pull.remainingCount', { remaining, limit: DAILY_NEARBY_LIMIT })}
              </span>
            )}
          </span>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          ref={swipeClose.ref}
          side="bottom"
          className="max-h-[85vh] overflow-y-auto overscroll-contain z-[1500] rounded-t-[28px] px-4 pt-3 pb-6"
          style={swipeClose.style}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden />
          <SheetHeader className="text-left pr-12">
            <SheetTitle className="font-display text-[17px] leading-snug">
              {result?.location || t('map.pull.sheetTitle')}
            </SheetTitle>
          </SheetHeader>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t('map.pull.sheetSubtitle')}</p>
          <div className="mt-3">
            {!!result?.animals.length && (() => {
              const isMine = (a: DiscoveredAnimal) => !!status[a.name?.toLowerCase() ?? '']?.mine;
              const groups = [
                { key: 'todo', label: t('map.zones.toFind'), items: result.animals.filter((a) => !isMine(a)) },
                { key: 'got', label: t('map.zones.alreadyCaptured'), items: result.animals.filter((a) => isMine(a)) },
              ].filter((g) => g.items.length);
              let i = 0;
              return groups.map((g) => (
                <div key={g.key} className="pt-3 first:pt-0">
                  <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                    {g.label} · {g.items.length}
                  </p>
                  {g.items.map((a) => {
                    const st = status[a.name?.toLowerCase() ?? ''] || { mine: false, recent: 0 };
                    const Icon = getCategoryIcon(a.category || '');
                    const captured = g.key === 'got';
                    const delay = 60 * i++;
                    return (
                      <button
                        type="button"
                        key={`${a.name}-${a.scientific_name}`}
                        onClick={() => { setOpen(false); navigate(`/home?tab=categories&q=${encodeURIComponent(a.name)}`); }}
                        className="flex w-full items-center gap-3 py-2.5 text-left animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 active:opacity-70"
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${captured ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground/70'}`}>
                          {st.photo ? (
                            <img src={thumbUrl(st.photo, 160)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <Icon className="w-6 h-6" />
                          )}
                          {captured && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background">
                              <Check className="w-3 h-3" strokeWidth={3.5} />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-display font-bold text-sm truncate ${captured ? 'text-foreground' : 'text-foreground/85'}`}>{speciesName(a.name)}</p>
                          <p className="text-[11px] italic text-muted-foreground truncate">{a.scientific_name}</p>
                          {st.recent > 0 && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              {t('map.pull.recentlySeen', { count: st.recent })}
                            </p>
                          )}
                          {!!a.tip && (
                            <p className="mt-0.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <Lightbulb className="w-3 h-3 shrink-0 mt-[2px] text-primary/70" />
                              <span className="line-clamp-1">{a.tip}</span>
                            </p>
                          )}
                        </div>
                        <RarityBadge rarity={a.rarity} plain className="shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ));
            })()}
            {result && result.animals.length === 0 && (
              <p className="text-[13px] text-muted-foreground py-4 text-center">
                {t('map.pull.noAnimalsFound')}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default PullToDiscover;
