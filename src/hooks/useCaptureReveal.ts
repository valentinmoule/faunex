import { useCallback, useState } from 'react';
import { type Rarity, RARITY_FX, RARITY_RANK, normalizeRarity } from '@/data/mockData';
import type { AnimalResult } from '@/types/capture';

export type RevealPhase = 'idle' | 'freeze' | 'shaking' | 'burst' | 'done';

export const REVEAL_TIMINGS: Record<Rarity, { freeze: number; shake: number; burst: number }> = {
  common: { freeze: 500, shake: 400, burst: 500 },
  uncommon: { freeze: 550, shake: 450, burst: 550 },
  rare: { freeze: 650, shake: 550, burst: 650 },
  very_rare: { freeze: 750, shake: 700, burst: 750 },
  ultra_rare: { freeze: 900, shake: 900, burst: 900 },
  illustration_rare: { freeze: 1000, shake: 1000, burst: 950 },
  special_rare: { freeze: 1100, shake: 1100, burst: 1000 },
  hyper_rare: { freeze: 1200, shake: 1200, burst: 1100 },
};

/** Orchestrates the lootbox-style reveal sequence (freeze → shake → burst → done). */
export const useCaptureReveal = (onReveal: (animal: AnimalResult) => void) => {
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [revealRarity, setRevealRarity] = useState<Rarity>('common');
  const [freezeFlash, setFreezeFlash] = useState(false);

  const reset = useCallback(() => setRevealPhase('idle'), []);

  const triggerReveal = useCallback(
    (animal: AnimalResult) => {
      const rarity = normalizeRarity(animal.rarity);
      setRevealRarity(rarity);
      const fx = RARITY_FX[rarity];
      const t = REVEAL_TIMINGS[rarity];

      setFreezeFlash(true);
      setRevealPhase('freeze');
      if (navigator.vibrate) {
        navigator.vibrate(
          fx === 'gold' ? [50, 30, 50, 30, 80] : fx === 'silver' ? [40, 20, 60] : [30]
        );
      }
      setTimeout(() => setFreezeFlash(false), 150);

      setTimeout(() => {
        setRevealPhase('shaking');
        setTimeout(() => {
          setRevealPhase('burst');
          onReveal(animal);
          if (navigator.vibrate) {
            navigator.vibrate(
              fx === 'gold'
                ? [100, 50, 100, 50, 200]
                : fx === 'silver'
                ? [80, 40, 120]
                : RARITY_RANK[rarity] >= 2
                ? [60, 30, 80]
                : [40]
            );
          }
          setTimeout(() => setRevealPhase('done'), t.burst);
        }, t.shake);
      }, t.freeze);
    },
    [onReveal]
  );

  return { revealPhase, revealRarity, freezeFlash, triggerReveal, reset };
};
