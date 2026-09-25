import { ReactNode, useLayoutEffect, useState } from 'react';

/**
 * 3-column grid that plays a "cards slid into binder sleeves" intro
 * each time a collection is opened (introKey change). Later filter
 * changes don't replay it.
 */
export function BinderGrid({ introKey, children }: { introKey: string; children: ReactNode }) {
  const [phase, setPhase] = useState<'preparing' | 'playing' | 'settled'>('preparing');

  useLayoutEffect(() => {
    setPhase('preparing');
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setPhase('playing'));
    });
    const settleTimer = window.setTimeout(() => setPhase('settled'), 1450);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
    };
  }, [introKey]);

  return (
    <div
      key={introKey}
      className={`grid grid-cols-3 gap-2 binder-grid binder-grid--${phase}`}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export default BinderGrid;
