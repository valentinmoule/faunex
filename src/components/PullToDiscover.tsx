import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Radar, Sparkles, MapPin, Check, Star, Lightbulb, Users } from 'lucide-react';
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

const ENABLED_ROUTES = ['/home', '/explorers', '/profile'];

const THRESHOLD = 88;
const MAX_PULL = 150;

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  uncommon: '#3f4a5c',
  very_rare: '#1c2333',
  ultra_rare: '#94a3b8',
  illustration_rare: '#eab308',
  special_rare: '#f59e0b',
  hyper_rare: '#d97706',
};

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
      supabase.from('captures').select('animal_name').eq('user_id', uid).eq('status', 'approved').in('animal_name', names),
      supabase.from('captures').select('animal_name,user_id,image_url,created_at').eq('status', 'approved').eq('shared', true)
        .in('animal_name', names).gte('created_at', since).order('created_at', { ascending: false }).limit(200),
    ]).then(([mine, recent]) => {
      if (cancelled) return;
      const next: Record<string, { mine: boolean; recent: number; photo?: string }> = {};
      names.forEach((n) => { next[n.toLowerCase()] = { mine: false, recent: 0 }; });
      (mine.data || []).forEach((r: any) => { const k = r.animal_name?.toLowerCase(); if (next[k]) next[k].mine = true; });
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

  const runDiscovery = useCallback(async () => {
    if (!('geolocation' in navigator)) {
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
    void getCurrentPosition(
      async (pos) => {
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
      },
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
    const onRequest = () => { if (!loading) void runDiscovery(); };
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
          className="max-h-[85vh] overflow-y-auto z-[1500]"
          style={swipeClose.style}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 font-display">
              <Sparkles className="w-5 h-5 text-primary" />
              {result?.location || t('map.pull.sheetTitle')}
            </SheetTitle>
          </SheetHeader>
          <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {t('map.pull.sheetSubtitle')}
          </p>
          <div className="mt-4 space-y-3">
            {result?.animals.map((a, i) => {
              const st = status[a.name?.toLowerCase()] || { mine: false, recent: 0 };
              const tint = RARITY_COLORS[a.rarity] || 'hsl(var(--border))';
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => { setOpen(false); navigate(`/home?tab=categories&q=${encodeURIComponent(a.name)}`); }}
                  className="mission-plate w-full text-left p-3.5 rounded-[22px] border bg-card active:scale-[0.98] transition-transform animate-fade-in"
                  style={{ borderColor: `${tint}40`, animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex gap-3">
                    <div className="relative w-[72px] h-[72px] shrink-0 rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
                      {st.photo ? (
                        <img src={thumbUrl(st.photo, 200)} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]',
                          st.mine ? 'text-primary' : 'text-accent-foreground',
                        )}>
                          {st.mine ? <Check className="w-3 h-3" strokeWidth={3} /> : <Star className="w-3 h-3" />}
                          {st.mine ? t('map.pull.inMyFaunex') : t('map.pull.newSpecies')}
                        </span>
                        <RarityBadge rarity={a.rarity} plain className="ml-auto" />
                      </div>
                      <p className="font-display font-bold text-[15px] text-foreground leading-tight mt-1 truncate">{a.name}</p>
                      <p className="text-[11.5px] italic text-muted-foreground truncate">{a.scientific_name}</p>
                      {st.recent > 0 && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10.5px] font-semibold">
                          <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" /><span className="relative w-1.5 h-1.5 rounded-full bg-primary" /></span>
                          <Users className="w-3 h-3" />
                          {t('map.pull.recentlySeen', { count: st.recent })}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.description && <p className="text-[12.5px] mt-2.5 text-foreground/80 leading-snug">{a.description}</p>}
                  {a.tip && (
                    <div className="mt-2.5 flex gap-2 rounded-xl bg-muted/60 px-3 py-2">
                      <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11.5px] text-muted-foreground leading-snug">
                        <span className="font-semibold text-foreground">{t('map.pull.tipLabel')}&nbsp;:</span> {a.tip}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
            {result && result.animals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
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
