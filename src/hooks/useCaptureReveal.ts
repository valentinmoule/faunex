import { useCallback, useState } from 'react';
import type { Rarity } from '@/data/mockData';
import type { AnimalResult } from '@/types/capture';

export type RevealPhase = 'idle' | 'freeze' | 'shaking' | 'burst' | 'done';

export const REVEAL_TIMINGS: Record<Rarity, { freeze: number; shake: number; burst: number }> = {
  common: { freeze: 500, shake: 400, burst: 500 },
  rare: { freeze: 700, shake: 600, burst: 700 },
  epic: { freeze: 900, shake: 900, burst: 900 },
  mythic: { freeze: 1200, shake: 1200, burst: 1100 },
};

/** Orchestrates the lootbox-style reveal sequence (freeze → shake → burst → done). */
export const useCaptureReveal = (onReveal: (animal: AnimalResult) => void) => {
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [revealRarity, setRevealRarity] = useState<Rarity>('common');
  const [freezeFlash, setFreezeFlash] = useState(false);

  const reset = useCallback(() => setRevealPhase('idle'), []);

  const triggerReveal = useCallback(
    (animal: AnimalResult) => {
      const rarity = animal.rarity as Rarity;
      setRevealRarity(rarity);
      const t = REVEAL_TIMINGS[rarity];

      setFreezeFlash(true);
      setRevealPhase('freeze');
      if (navigator.vibrate) {
        navigator.vibrate(
          rarity === 'mythic' ? [50, 30, 50, 30, 80] : rarity === 'epic' ? [40, 20, 60] : [30]
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
              rarity === 'mythic'
                ? [100, 50, 100, 50, 200]
                : rarity === 'epic'
                ? [80, 40, 120]
                : rarity === 'rare'
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
