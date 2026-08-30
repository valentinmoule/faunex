import { useEffect, useRef, useState } from 'react';
import { consumePendingShelve, peekPendingShelve, type PendingShelve } from '@/lib/shelveAnimation';
import { type BestiaryAnimal } from '@/lib/bestiary';
import { hapticDiscovery } from '@/lib/haptics';

interface Options {
  animals: BestiaryAnimal[];
  loading: boolean;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string) => void;
  /** Label of the "all species" view where the animation must be played. */
  allSpeciesLabel: string;
  /** Called right before opening the grid — used to close any collection/zone view. */
  onOpenTarget?: () => void;
}

/** Plays the "card glides into its shelf slot" animation after a new capture. */
export const useShelveAnimation = ({
  animals,
  loading,
  selectedCategory,
  setSelectedCategory,
  allSpeciesLabel,
  onOpenTarget,
}: Options) => {
  const [pendingShelve, setPendingShelve] = useState<PendingShelve | null>(null);
  const [flyingCardStyle, setFlyingCardStyle] = useState<React.CSSProperties | null>(null);
  const [flashSlotName, setFlashSlotName] = useState<string | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shelveAnimationRan = useRef(false);

  // Detect pending shelve animation request on mount
  useEffect(() => {
    const peeked = peekPendingShelve();
    if (peeked && !shelveAnimationRan.current) {
      setPendingShelve(peeked);
    }
  }, []);

  // Always play the animation in the full "all species" grid of the bestiary
  useEffect(() => {
    if (!pendingShelve || loading || shelveAnimationRan.current) return;
    if (selectedCategory !== allSpeciesLabel) {
      onOpenTarget?.();
      setSelectedCategory(allSpeciesLabel);
    }
  }, [pendingShelve, loading, selectedCategory, setSelectedCategory, allSpeciesLabel, onOpenTarget]);


  // Play the glide-into-slot animation once the slot is mounted
  useEffect(() => {
    if (!pendingShelve || shelveAnimationRan.current) return;
    if (!selectedCategory) return;

    const slotKey = pendingShelve.animalName.toLowerCase();
    const timers: number[] = [];
    let cancelled = false;
    let attempts = 0;

    const runWhenMounted = () => {
      if (cancelled) return;
      const slotEl = slotRefs.current[slotKey];
      if (!slotEl) {
        attempts += 1;
        if (attempts < 50) timers.push(window.setTimeout(runWhenMounted, 100));
        return;
      }
      shelveAnimationRan.current = true;
      consumePendingShelve(); // clear storage so it doesn't replay

      // Position the page on the card first (instant, so the measure below is stable)
      slotEl.scrollIntoView({ behavior: 'auto', block: 'center' });

      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        // Re-check position after any layout shift, then measure
        slotEl.scrollIntoView({ behavior: 'auto', block: 'center' });
        const rect = slotEl.getBoundingClientRect();

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
            setFlyingCardStyle({
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
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
          timers.push(window.setTimeout(() => {
            setFlyingCardStyle(null);
            setPendingShelve(null);
          }, 300));
          timers.push(window.setTimeout(() => setFlashSlotName(null), 1600));
        }, 1450));
      }, 650));
    };

    const raf = requestAnimationFrame(runWhenMounted);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
    };
  }, [pendingShelve, selectedCategory, animals, loading]);

  return { pendingShelve, flyingCardStyle, flashSlotName, slotRefs };
};
