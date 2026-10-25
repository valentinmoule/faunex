import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/**
 * Dernière position du carrousel (index du sachet centré), conservée au
 * démontage pour y revenir quand l'utilisateur revient d'une collection.
 */
let rememberedActive = 0;

/**
 * Carrousel horizontal de boosters : un sachet centré en grand, les voisins
 * réduits de chaque côté ; défilement au doigt avec aimantation.
 */
const BoosterCarousel = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [active, setActive] = useState(() => Math.min(rememberedActive, items.length - 1));
  const activeRef = useRef(Math.min(rememberedActive, items.length - 1));

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
    activeRef.current = best;
    setActive(best);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update, items.length]);

  // Largeur du booster dérivée de la hauteur réellement disponible : tout
  // (titre, sachet, stepper) tient dans l'écran sans défilement vertical.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const styles = getComputedStyle(el);
      const available =
        el.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
      // Garder une portion lisible des voisins, même après leur réduction.
      const w = Math.min(available * 0.56, 320, el.clientWidth * 0.68);
      el.parentElement?.style.setProperty('--booster-w', `${Math.round(w)}px`);
      update();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
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

  // Un appui sur un sachet voisin le recentre au lieu d'ouvrir la collection.
  const scrollToItem = (i: number) => {
    const el = ref.current;
    const node = el?.children[i] as HTMLElement | undefined;
    if (!el || !node) return;
    suppressClick.current = false;
    el.scrollTo({ left: node.offsetLeft - (el.clientWidth - node.offsetWidth) / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return (
    <div className="booster-carousel -mx-4 flex min-h-0 flex-1 flex-col">
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
        className="flex min-h-0 flex-1 cursor-grab select-none snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pt-2 pb-10 no-scrollbar"
        style={{ paddingInline: 'calc(50% - var(--booster-w) / 2)' }}
      >
        {items.map((child, i) => (
          <div
            key={i}
            onClickCapture={(e) => {
              if (i !== activeRef.current) {
                e.preventDefault();
                e.stopPropagation();
                suppressClick.current = false;
                scrollToItem(i);
              }
            }}
            className="w-[var(--booster-w)] shrink-0 snap-center transition-[transform,opacity] duration-150 ease-out will-change-transform"
          >
            {child}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="relative flex shrink-0 flex-nowrap justify-center px-3 pb-5">
          {items.map((_, i) => (
            <Button
              key={i}
              variant="ghost"
              size="icon"
              className="h-6 min-w-0 max-w-6 shrink-0 grow basis-0 rounded-full p-0 hover:bg-transparent"
              aria-label={t('bestiary.collections.goToBooster', { number: i + 1 })}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => scrollToItem(i)}
            >
              <span className={`h-1.5 max-w-full rounded-full transition-all ${i === active ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`} />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BoosterCarousel;
