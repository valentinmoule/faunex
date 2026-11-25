import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import chestOpenArt from '@/assets/quests/chest-open.webp';

/** Effet plein écran lors de la récolte d'une récompense de quête. */
export default function RewardBurst({ xp }: { xp: number }) {
  const target = (document.querySelector('[role="dialog"]') as HTMLElement | null) ?? document.body;
  return createPortal(
    <div aria-hidden className="reward-burst pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
      <div className="reward-burst-flash absolute inset-0" />
      <div className="reward-burst-rays absolute h-[520px] w-[520px]" />
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className={`reward-burst-confetti absolute ${i % 3 === 0 ? 'bg-primary' : i % 3 === 1 ? 'bg-amber' : 'bg-forest-light'} ${i % 2 ? 'h-3 w-1.5 rounded-sm' : 'h-2.5 w-2.5 rounded-full'}`}
          style={{ '--a': `${(i * 360) / 28}deg`, '--d': `${130 + (i % 5) * 34}px`, animationDelay: `${(i % 4) * 30}ms` } as CSSProperties}
        />
      ))}
      <div className="relative flex flex-col items-center">
        <img src={chestOpenArt} alt="" className="reward-burst-chest h-36 w-36 object-contain" />
        <span className="reward-burst-xp mt-1 font-display text-5xl font-black text-primary">+{xp} XP</span>
      </div>
    </div>,
    target,
  );
}
