import { useCallback, useRef, useState } from 'react';

/**
 * Swipe vers le bas pour fermer une bottom sheet (style iOS).
 * Ne s'active que lorsque le contenu scrollable est tout en haut,
 * pour ne pas entrer en conflit avec le scroll interne.
 */
export function useSwipeDownClose(onClose: () => void, threshold = 90) {
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [settling, setSettling] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 4) return;
    startY.current = e.touches[0].clientY;
    setSettling(false);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current == null) return;
      const el = e.currentTarget as HTMLElement;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        // L'utilisateur remonte : on laisse le scroll natif faire
        if (dy < -8) startY.current = null;
        return;
      }
      // Geste vers le bas depuis le haut : on prend la main
      if (el.scrollTop > 4) {
        startY.current = null;
        return;
      }
      if (e.cancelable) e.preventDefault();
      setDragY(Math.min(dy * 0.7, 260));
    },
    [],
  );

  const onTouchEnd = useCallback(() => {
    if (startY.current == null && dragY === 0) return;
    startY.current = null;
    if (dragY >= threshold) {
      onClose();
    }
    setSettling(true);
    setDragY(0);
  }, [dragY, onClose, threshold]);

  const style: React.CSSProperties = {
    transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
    transition: dragY === 0 && settling ? 'transform 280ms cubic-bezier(0.22,1,0.36,1)' : 'none',
  };

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd }, style, isDragging: dragY > 0 };
}
