import { useCallback, useEffect, useState } from 'react';

/**
 * Swipe vers le bas pour fermer une bottom sheet (style iOS).
 *
 * Utilise des listeners natifs non-passifs attachés directement à l'élément :
 * les handlers React synthétiques (onTouchMove) sont passifs, donc
 * e.preventDefault() y est ignoré et le scroll natif prend le pas sur le geste.
 *
 * Ne s'active que lorsque le contenu scrollable est tout en haut,
 * pour ne pas entrer en conflit avec le scroll interne.
 *
 * Usage : <SheetContent ref={swipe.ref} style={swipe.style} ... />
 */
export function useSwipeDownClose(onClose: () => void, threshold = 90) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [dragY, setDragY] = useState(0);

  const ref = useCallback((node: HTMLElement | null) => {
    setEl(node);
  }, []);

  useEffect(() => {
    if (!el) return;

    let startY: number | null = null;
    let dragging = false;
    let current = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (el.scrollTop > 4) return;
      startY = e.touches[0].clientY;
      dragging = false;
    };

    const onMove = (e: TouchEvent) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        // L'utilisateur remonte : on abandonne, le scroll natif fait le reste
        if (dy < -8) startY = null;
        return;
      }
      // Geste vers le bas mais la liste a scrollé entre-temps : abandon
      if (el.scrollTop > 4) {
        startY = null;
        return;
      }
      if (!dragging && dy < 6) return;
      dragging = true;
      // Non-passif : on bloque le scroll natif pour garder la main sur le geste
      if (e.cancelable) e.preventDefault();
      current = Math.min(dy * 0.7, 260);
      setDragY(current);
    };

    const onEnd = () => {
      if (startY == null && !dragging) return;
      startY = null;
      const shouldClose = dragging && current >= threshold;
      dragging = false;
      current = 0;
      setDragY(0);
      if (shouldClose) onClose();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [el, onClose, threshold]);

  const style: React.CSSProperties = {
    transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
    transition: dragY === 0 ? 'transform 280ms cubic-bezier(0.22,1,0.36,1)' : 'none',
  };

  return { ref, style, isDragging: dragY > 0 };
}
