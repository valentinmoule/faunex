import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Carrousel horizontal de boosters : un sachet centré en grand, les voisins
 * réduits de chaque côté ; défilement au doigt avec aimantation.
 */
const BoosterCarousel = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [active, setActive] = useState(0);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const mid = node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      const ratio = Math.min(dist / node.offsetWidth, 1);
      node.style.transform = `scale(${1 - ratio * 0.16})`;
      node.style.opacity = String(1 - ratio * 0.35);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update, items.length]);

  // Glisser à la souris (Chrome desktop) : le défilement natif ne répond qu'au tactile.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      el.style.scrollSnapType = 'none';
      el.style.cursor = 'grabbing';
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d?.moved || !el) return;
    suppressClick.current = true;
    el.style.cursor = '';
    // Aimante vers le sachet le plus proche du centre.
    const center = el.scrollLeft + el.clientWidth / 2;
    let target = 0; let bestDist = Infinity;
    Array.from(el.children).forEach((c) => {
      const n = c as HTMLElement;
      const mid = n.offsetLeft + n.offsetWidth / 2;
      if (Math.abs(mid - center) < bestDist) { bestDist = Math.abs(mid - center); target = mid - el.clientWidth / 2; }
    });
    el.scrollTo({ left: target, behavior: 'smooth' });
    window.setTimeout(() => { if (ref.current) ref.current.style.scrollSnapType = ''; }, 400);
  };

  return (
    <div className="-mx-4">
      <div
        ref={ref}
        onScroll={update}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; }
        }}
        onDragStart={(e) => e.preventDefault()}
        className="flex cursor-grab select-none snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-[16vw] py-6 scrollbar-none"
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="w-[68vw] max-w-[320px] shrink-0 snap-center transition-[transform,opacity] duration-150 ease-out will-change-transform"
          >
            {child}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {items.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BoosterCarousel;
