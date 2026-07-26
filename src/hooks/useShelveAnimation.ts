import { useEffect, useRef, useState } from 'react';
import { consumePendingShelve, peekPendingShelve, type PendingShelve } from '@/lib/shelveAnimation';
import { normalizeCategory, type BestiaryAnimal } from '@/lib/bestiary';

interface Options {
  animals: BestiaryAnimal[];
  loading: boolean;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string) => void;
}

/** Plays the "card glides into its shelf slot" animation after a new capture. */
export const useShelveAnimation = ({ animals, loading, selectedCategory, setSelectedCategory }: Options) => {
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

  // Auto-open the target category as soon as data is ready
  useEffect(() => {
    if (!pendingShelve || loading || shelveAnimationRan.current) return;
    const targetCat = normalizeCategory(pendingShelve.category);
    const match = animals.find(
      (a) => a.name.toLowerCase() === pendingShelve.animalName.toLowerCase(),
    );
    const catName = match ? normalizeCategory(match.category) : targetCat;
    if (selectedCategory !== catName) {
      setSelectedCategory(catName);
    }
  }, [pendingShelve, loading, animals, selectedCategory, setSelectedCategory]);

  // Play the glide-into-slot animation once the slot is mounted
  useEffect(() => {
    if (!pendingShelve || shelveAnimationRan.current) return;
    if (!selectedCategory) return;

    const slotKey = pendingShelve.animalName.toLowerCase();
    const raf = requestAnimationFrame(() => {
      const slotEl = slotRefs.current[slotKey];
      if (!slotEl) return;
      shelveAnimationRan.current = true;
      consumePendingShelve(); // clear storage so it doesn't replay

      slotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        const rect = slotEl.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const startSize = Math.min(280, vw * 0.7);
        const startLeft = (vw - startSize) / 2;
        const startTop = (vh - startSize) / 2;

        setFlyingCardStyle({
          left: `${startLeft}px`,
          top: `${startTop}px`,
          width: `${startSize}px`,
          height: `${startSize}px`,
          transform: 'rotate(-4deg) scale(1)',
          opacity: 1,
        });

        requestAnimationFrame(() => {
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
        });

        setTimeout(() => {
          setFlashSlotName(slotKey);
          setFlyingCardStyle((prev) => (prev ? { ...prev, opacity: 0 } : null));
          if (navigator.vibrate) navigator.vibrate([30, 20, 60]);
          setTimeout(() => {
            setFlyingCardStyle(null);
            setPendingShelve(null);
          }, 250);
          setTimeout(() => setFlashSlotName(null), 1200);
        }, 900);
      }, 450);
    });

    return () => cancelAnimationFrame(raf);
  }, [pendingShelve, selectedCategory, animals, loading]);

  return { pendingShelve, flyingCardStyle, flashSlotName, slotRefs };
};
