import { useCallback, useEffect, useRef, useState } from 'react';
import { type Rarity, RARITY_RANK, normalizeRarity } from '@/data/mockData';
import type { AnimalResult } from '@/types/capture';

export type RevealPhase = 'idle' | 'charging' | 'burst' | 'done';

/** Durées (ms) : plus l'espèce est rare, plus la montée et l'explosion durent. */
export const revealTimings = (rarity: Rarity) => {
  const rank = RARITY_RANK[rarity] ?? 0;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return { charge: 0, burst: 700 };
  return { charge: 700 + rank * 180, burst: 1600 + rank * 230 };
};

const vibrate = (p: number | number[]) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(p);
  } catch {
    /* unsupported */
  }
};

const nativeImpact = (heavy: boolean) => {
  void import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: heavy ? ImpactStyle.Heavy : ImpactStyle.Medium }),
    )
    .catch(() => {});
};

/** Orchestration de la révélation : montée (charging) → explosion (burst) → fiche (done). */
export const useCaptureReveal = (onReveal: (animal: AnimalResult) => void) => {
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [revealRarity, setRevealRarity] = useState<Rarity>('common');
  const [revealAnimal, setRevealAnimal] = useState<AnimalResult | null>(null);
  const timers = useRef<number[]>([]);
  const animalRef = useRef<AnimalResult | null>(null);

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const reset = useCallback(() => {
    clear();
    setRevealPhase('idle');
  }, []);

  const burstNow = useCallback(
    (animal: AnimalResult, rarity: Rarity) => {
      const rank = RARITY_RANK[rarity] ?? 0;
      setRevealPhase('burst');
      onReveal(animal);
      vibrate(rank >= 6 ? [120, 60, 160, 60, 260] : rank >= 3 ? [90, 50, 140] : [45]);
      nativeImpact(rank >= 3);
      if (rank >= 6) timers.current.push(window.setTimeout(() => nativeImpact(true), 380));
    },
    [onReveal],
  );

  const triggerReveal = useCallback(
    (animal: AnimalResult) => {
      clear();
      const rarity = normalizeRarity(animal.rarity);
      const rank = RARITY_RANK[rarity] ?? 0;
      const t = revealTimings(rarity);
      animalRef.current = animal;
      setRevealAnimal(animal);
      setRevealRarity(rarity);
      setRevealPhase('charging');
      // Battements qui accélèrent pendant la montée.
      const ticks = Math.min(2 + rank, 8);
      vibrate(Array.from({ length: ticks * 2 - 1 }, (_, i) => (i % 2 ? Math.max(60 - i * 5, 20) : 18 + i * 2)));
      timers.current.push(window.setTimeout(() => burstNow(animal, rarity), t.charge));
      timers.current.push(window.setTimeout(() => setRevealPhase('done'), t.charge + t.burst));
    },
    [burstNow],
  );

  /** Tap pour passer : on saute directement à la fiche. */
  const skip = useCallback(() => {
    const animal = animalRef.current;
    if (!animal) return;
    clear();
    if (revealPhase === 'charging') onReveal(animal);
    setRevealPhase('done');
  }, [onReveal, revealPhase]);

  return { revealPhase, revealRarity, revealAnimal, triggerReveal, reset, skip };
};
