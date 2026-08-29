import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimalCard } from '@/data/mockData';
import RarityBadge from '@/components/RarityBadge';
import { rarityBorderColor } from '@/lib/bestiary';
import { hapticTap } from '@/lib/haptics';

/** Socle coloré (profondeur "jeu mobile") selon la rareté. */
const tileDepthClass: Record<string, string> = {
  rare: 'game-tile--rare',
  epic: 'game-tile--epic',
  mythic: 'game-tile--mythic',
};

const LONG_PRESS_MS = 400;

interface Props {
  items: AnimalCard[];
  onSelect: (card: AnimalCard) => void;
  /** Appelé quand l'utilisateur termine un glisser-déposer : nouvel ordre complet. */
  onReorder: (orderedIds: string[]) => void;
}

/** Grille "Mes captures" avec réorganisation au long press (drag & drop tactile + souris). */
export const MyCapturesGrid = ({ items, onSelect, onReorder }: Props) => {
  const [order, setOrder] = useState<AnimalCard[]>(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const orderRef = useRef<AnimalCard[]>(items);

  useEffect(() => {
    setOrder(items);
    orderRef.current = items;
  }, [items]);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const endDrag = useCallback(
    (commit: boolean) => {
      clearTimer();
      const wasDragging = dragIndexRef.current !== null;
      dragIndexRef.current = null;
      setDragIndex(null);
      setGhost(null);
      startRef.current = null;
      if (wasDragging && commit) {
        onReorder(orderRef.current.map((c) => c.id));
      }
    },
    [onReorder],
  );

  // Empêche le scroll de la page pendant un glisser-déposer tactile.
  useEffect(() => {
    if (dragIndex === null) return;
    const block = (e: TouchEvent) => e.preventDefault();
    window.addEventListener('touchmove', block, { passive: false });
    return () => window.removeEventListener('touchmove', block);
  }, [dragIndex]);

  const moveItem = (from: number, to: number) => {
    setOrder((prev) => {
      if (from === to || from < 0 || to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      orderRef.current = next;
      return next;
    });
    dragIndexRef.current = to;
    setDragIndex(to);
  };

  const handlePointerDown = (index: number) => (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    movedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      dragIndexRef.current = index;
      setDragIndex(index);
      setGhost({ x: 0, y: 0 });
      hapticTap();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (dragIndexRef.current === null) {
      // Un mouvement avant la fin du long press = scroll : on annule.
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        clearTimer();
        startRef.current = null;
      }
      return;
    }

    movedRef.current = true;
    setGhost({ x: dx, y: dy });

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const tile = el?.closest<HTMLElement>('[data-capture-index]');
    if (!tile) return;
    const overIndex = Number(tile.dataset.captureIndex);
    if (!Number.isNaN(overIndex) && overIndex !== dragIndexRef.current) {
      startRef.current = { x: e.clientX, y: e.clientY };
      setGhost({ x: 0, y: 0 });
      moveItem(dragIndexRef.current, overIndex);
      hapticTap();
    }
  };

  const handlePointerUp = () => {
    const wasDragging = dragIndexRef.current !== null;
    endDrag(true);
    if (!wasDragging) startRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 gap-2 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => endDrag(false)}
      onContextMenu={(e) => {
        if (dragIndex !== null) e.preventDefault();
      }}
    >
      {order.map((animal, index) => {
        const isDragging = dragIndex === index;
        return (
          <div
            key={animal.id}
            data-capture-index={index}
            onPointerDown={handlePointerDown(index)}
            onClick={() => {
              if (movedRef.current) {
                movedRef.current = false;
                return;
              }
              onSelect(animal);
            }}
            style={
              isDragging && ghost
                ? {
                    transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0) scale(1.06) rotate(1.5deg)`,
                    zIndex: 30,
                    touchAction: 'none',
                  }
                : undefined
            }
            className={`game-tile relative aspect-[3/4] rounded-xl border-2 overflow-hidden cursor-pointer ${
              rarityBorderColor[animal.rarity] || 'border-border'
            } ${tileDepthClass[animal.rarity] || ''} bg-card ${
              isDragging
                ? 'shadow-2xl ring-2 ring-primary/60 transition-none'
                : dragIndex !== null
                  ? 'transition-transform duration-200'
                  : ''
            }`}
          >
            <img
              src={animal.image}
              alt={animal.name}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              loading="lazy"
            />
            <div className="absolute top-1 right-1 pointer-events-none">
              <RarityBadge rarity={animal.rarity} />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8 pointer-events-none">
              <p className="text-xs font-display font-bold text-white truncate leading-tight">
                {animal.name}
              </p>
              {animal.scientificName && (
                <p className="text-[9px] font-body italic text-white/80 truncate">
                  {animal.scientificName}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MyCapturesGrid;
