import { Children, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

const PAGE = 36;
const MAX_FLYING = 18;
const TOTAL_MS = 1500;
const FLIGHT_MS = 640;

/**
 * 3-column grid for a collection. Renders progressively (keeps big
 * collections like mammals smooth) and, on open, deals the user's
 * discovered cards from a deck at the bottom of the screen into their
 * sleeves (~1.5 s). Only visible discovered cards fly — the rest are
 * static, so the effect stays cheap.
 */
export function BinderGrid({ introKey, children }: { introKey: string; children: ReactNode }) {
  const items = Children.toArray(children);
  const [count, setCount] = useState(PAGE);
  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const playedFor = useRef<string | null>(null);

  useLayoutEffect(() => {
    setCount(PAGE);
  }, [introKey]);

  // Deal animation, once per opened collection, as soon as cards exist.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || items.length === 0 || playedFor.current === introKey) return;
    playedFor.current = introKey;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof grid.animate !== 'function') return;

    const vh = window.innerHeight;
    const deckX = window.innerWidth / 2;
    const deckY = vh - 40;
    const slots = Array.from(grid.querySelectorAll<HTMLElement>('.binder-slot[data-captured="true"]'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh;
      })
      .slice(0, MAX_FLYING);
    if (slots.length === 0) return;

    const spread = Math.max(0, TOTAL_MS - FLIGHT_MS - 80);
    const step = slots.length > 1 ? Math.min(90, spread / (slots.length - 1)) : 0;
    const anims: Animation[] = [];
    slots.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dx = deckX - (r.left + r.width / 2);
      const dy = deckY - (r.top + r.height / 2);
      const rot = ((i * 37) % 24) - 12;
      el.style.zIndex = String(100 - i);
      const a = el.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg) scale(0.55)`, opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: `translate3d(${dx * 0.12}px, ${dy * 0.12 - 18}px, 0) rotate(${rot * 0.2}deg) scale(1.08)`, offset: 0.72 },
          { transform: 'translate3d(0, 2px, 0) rotate(0deg) scale(0.97)', offset: 0.88 },
          { transform: 'none', opacity: 1 },
        ],
        {
          duration: FLIGHT_MS,
          delay: 80 + i * step,
          easing: 'cubic-bezier(0.25, 0.8, 0.35, 1)',
          fill: 'backwards',
        },
      );
      a.onfinish = () => { el.style.zIndex = ''; };
      anims.push(a);
    });
    return () => anims.forEach((a) => a.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introKey, items.length > 0]);

  // Progressive rendering on scroll.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || count >= items.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setCount((c) => c + PAGE);
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [count, items.length]);

  return (
    <>
      <div key={introKey} ref={gridRef} className="grid grid-cols-3 gap-2 binder-grid" aria-live="polite">
        {items.slice(0, count)}
      </div>
      {count < items.length && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </>
  );
}

export default BinderGrid;
