import { useCallback, useEffect, useRef, useState } from 'react';
import { consumePendingShelve, peekPendingShelve, type PendingShelve } from '@/lib/shelveAnimation';
import { hapticDiscovery } from '@/lib/haptics';

interface Options {
  /** Le catalogue est encore en chargement : on attend avant de jouer l'animation. */
  loading: boolean;
  /** Prépare la vue (ferme collections/territoires, vide les filtres) avant l'animation. */
  onPrepare?: () => void;
  /** Retourne l'élément DOM de la carte cible s'il est monté dans la grille. */
  resolveSlot: (animalName: string) => HTMLElement | null;
}

/** Plays the "card glides into its shelf slot" animation after a new capture. */
export const useShelveAnimation = ({ loading, onPrepare, resolveSlot }: Options) => {
  const [pendingShelve, setPendingShelve] = useState<PendingShelve | null>(null);
  const [flyingCardStyle, setFlyingCardStyle] = useState<React.CSSProperties | null>(null);
  const [flashSlotName, setFlashSlotName] = useState<string | null>(null);
  const shelveAnimationRan = useRef(false);
  const preparedRef = useRef(false);

  // Detect pending shelve animation request on mount
  useEffect(() => {
    const peeked = peekPendingShelve();
    if (peeked && !shelveAnimationRan.current) {
      setPendingShelve(peeked);
    }
  }, []);

  // Reset the bestiary view so the target card is part of the full species grid
  useEffect(() => {
    if (!pendingShelve || preparedRef.current) return;
    preparedRef.current = true;
    onPrepare?.();
  }, [pendingShelve, onPrepare]);

  // Play the glide-into-slot animation once the slot is mounted
  useEffect(() => {
    if (!pendingShelve || shelveAnimationRan.current || loading) return;

    const slotKey = pendingShelve.animalName.toLowerCase();
    const timers: number[] = [];
    let cancelled = false;
    let attempts = 0;

    const runWhenMounted = () => {
      if (cancelled) return;
      const slotEl = resolveSlot(pendingShelve.animalName);
      if (!slotEl) {
        attempts += 1;
        if (attempts < 60) timers.push(window.setTimeout(runWhenMounted, 100));
        return;
      }
      shelveAnimationRan.current = true;
      consumePendingShelve(); // clear storage so it doesn't replay

      // Position the page on the card first (instant, so the measure below is stable)
      slotEl.scrollIntoView({ behavior: 'auto', block: 'center' });

      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        const live = resolveSlot(pendingShelve.animalName) || slotEl;
        // Re-check position after any layout shift, then measure
        live.scrollIntoView({ behavior: 'auto', block: 'center' });
        const rect = live.getBoundingClientRect();

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const startWidth = Math.min(230, vw * 0.56);
        const startHeight = startWidth * (rect.height / Math.max(rect.width, 1));
        const startLeft = (vw - startWidth) / 2;
        const startTop = (vh - startHeight) / 2;

        setFlyingCardStyle({
          left: `${startLeft}px`,
          top: `${startTop}px`,
          width: `${startWidth}px`,
          height: `${startHeight}px`,
          transform: 'rotate(-7deg) scale(1)',
          opacity: 1,
        });

        timers.push(window.setTimeout(() => {
          requestAnimationFrame(() => {
            const target = resolveSlot(pendingShelve.animalName) || live;
            const to = target.getBoundingClientRect();
            setFlyingCardStyle({
              left: `${to.left}px`,
              top: `${to.top}px`,
              width: `${to.width}px`,
              height: `${to.height}px`,
              transform: 'rotate(0deg) scale(1)',
              opacity: 1,
            });
          });
        }, 520));

        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          setFlashSlotName(slotKey);
          setFlyingCardStyle((prev) => (prev ? { ...prev, opacity: 0 } : null));
          hapticDiscovery();

          timers.push(window.setTimeout(() => setFlyingCardStyle(null), 300));
          // Le flash dure 1100ms : on nettoie tout à la fin (couper `pendingShelve`
          // plus tôt annulerait ce timer via le cleanup de l'effet).
          timers.push(window.setTimeout(() => {
            setFlashSlotName(null);
            setPendingShelve(null);
          }, 1600));
        }, 1450));
      }, 650));
    };

    const raf = requestAnimationFrame(runWhenMounted);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
    };
  }, [pendingShelve, loading, resolveSlot]);

  const isFlashing = useCallback(
    (animalName: string) => flashSlotName === animalName.toLowerCase(),
    [flashSlotName],
  );

  return { pendingShelve, flyingCardStyle, flashSlotName, isFlashing };
};
