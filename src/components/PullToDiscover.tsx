import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Radar, Sparkles, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNearbyQuota, DAILY_NEARBY_LIMIT } from '@/hooks/useNearbyQuota';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSwipeDownClose } from '@/lib/useSwipeDownClose';

const ENABLED_ROUTES = ['/home', '/explorers', '/profile'];

const THRESHOLD = 88;
const MAX_PULL = 150;

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  mythic: '#f59e0b',
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
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const enabled = ENABLED_ROUTES.includes(location.pathname) && !!session?.user;
  const { remaining, unlimited, exhausted, consume } = useNearbyQuota(session?.user?.id);

  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ location: string; animals: DiscoveredAnimal[] } | null>(null);

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
      toast.error('Géolocalisation indisponible');
      return;
    }
    if (exhausted) {
      toast.error('Limite de 4 explorations par jour atteinte', {
        description: 'Passe au Premium pour explorer sans limite.',
        action: { label: 'Premium', onClick: () => navigate('/premium') },
      });
      return;
    }
    const allowed = await consume();
    if (!allowed) {
      toast.error('Limite de 4 explorations par jour atteinte', {
        description: 'Passe au Premium pour explorer sans limite.',
        action: { label: 'Premium', onClick: () => navigate('/premium') },
      });
      return;
    }
    setLoading(true);
    if ('vibrate' in navigator) navigator.vibrate?.(18);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error } = await supabase.functions.invoke('nearby-animals', {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          });
          if (error) throw error;
          setResult({
            location: (data as any)?.location_name || 'Autour de toi',
            animals: (data as any)?.animals || [],
          });
          setOpen(true);
        } catch (e) {
          console.error(e);
          toast.error('Impossible de chercher les espèces ici');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        toast.error("Impossible d'obtenir ta position");
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

  const progress = Math.min(1, pull / THRESHOLD);
  const ready = progress >= 1;
  const visible = pull > 2 || loading;

  if (!enabled) return null;

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
                ? 'Exploration en cours…'
                : exhausted
                  ? 'Limite quotidienne atteinte'
                  : ready
                    ? 'Relâche pour explorer'
                    : 'Tire pour explorer autour de toi'}
            </span>
            {!loading && !unlimited && remaining !== null && (
              <span className="text-[10px] font-medium text-muted-foreground leading-none">
                {exhausted
                  ? 'Passe au Premium pour explorer sans limite'
                  : `${remaining}/${DAILY_NEARBY_LIMIT} explorations restantes aujourd'hui`}
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
              {result?.location || 'Espèces à découvrir'}
            </SheetTitle>
          </SheetHeader>
          <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Espèces potentiellement observables ici
          </p>
          <div className="mt-4 space-y-3">
            {result?.animals.map((a, i) => (
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
                    <p className="text-[11px] mt-2 text-muted-foreground">
                      <span className="font-semibold">Astuce&nbsp;:</span> {a.tip}
                    </p>
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
            {result && result.animals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune espèce trouvée pour cette zone.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default PullToDiscover;
