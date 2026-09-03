import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimalCard } from '@/data/mockData';
import RarityBadge from '@/components/RarityBadge';
import { rarityBorderColor } from '@/lib/bestiary';
import { hapticTap } from '@/lib/haptics';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';

/** Socle coloré + ombre rareté (effet "rare à légendaire" en grille). */
const tileDepthClass: Record<string, string> = {
  rare: 'game-tile--rare game-tile--rare-shadow',
  very_rare: 'game-tile--very-rare game-tile--rare-shadow',
  ultra_rare: 'game-tile--silver game-tile--rare-shadow',
  illustration_rare: 'game-tile--gold game-tile--rare-shadow',
  special_rare: 'game-tile--gold game-tile--rare-shadow',
  hyper_rare: 'game-tile--hyper game-tile--rare-shadow',
};

const LONG_PRESS_MS = 400;
const MOVE_TOLERANCE = 10;

interface Props {
  items: AnimalCard[];
  onSelect: (card: AnimalCard) => void;
  /** Appelé quand l'utilisateur termine un glisser-déposer : nouvel ordre complet. */
  onReorder: (orderedIds: string[]) => void;
}

/** Grille "Mes captures" avec réorganisation au long press (drag & drop tactile + souris). */
export const MyCapturesGrid = ({ items, onSelect, onReorder }: Props) => {
  const { speciesName } = useSpeciesName();
  const [order, setOrder] = useState<AnimalCard[]>(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const orderRef = useRef<AnimalCard[]>(items);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  const moveItem = useCallback((from: number, to: number) => {
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
  }, []);

  const finish = useCallback(
    (commit: boolean) => {
      clearTimer();
      cleanupRef.current?.();
      cleanupRef.current = null;
      const wasDragging = dragIndexRef.current !== null;
      dragIndexRef.current = null;
      startRef.current = null;
      originRef.current = null;
      setDragIndex(null);
      setGhost({ x: 0, y: 0 });
      if (wasDragging && commit) {
        onReorder(orderRef.current.map((c) => c.id));
      }
      if (wasDragging) {
        // Empêche le clic de sélection juste après un drag.
        movedRef.current = true;
        window.setTimeout(() => {
          movedRef.current = false;
        }, 250);
      }
    },
    [onReorder],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  const handlePointerDown = (index: number) => (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    movedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    originRef.current = { x: e.clientX, y: e.clientY };

    // Listeners natifs : non-passifs pour pouvoir bloquer le scroll pendant le drag.
    const onMove = (ev: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;

      if (dragIndexRef.current === null) {
        if (
          Math.abs(ev.clientX - start.x) > MOVE_TOLERANCE ||
          Math.abs(ev.clientY - start.y) > MOVE_TOLERANCE
        ) {
          // L'utilisateur scrolle : on annule le long press.
          finish(false);
        }
        return;
      }

      ev.preventDefault();
      const origin = originRef.current!;
      setGhost({ x: ev.clientX - origin.x, y: ev.clientY - origin.y });

      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const tile = el?.closest<HTMLElement>('[data-capture-index]');
      if (!tile) return;
      const overIndex = Number(tile.dataset.captureIndex);
      if (!Number.isNaN(overIndex) && overIndex !== dragIndexRef.current) {
        originRef.current = { x: ev.clientX, y: ev.clientY };
        setGhost({ x: 0, y: 0 });
        moveItem(dragIndexRef.current, overIndex);
        hapticTap();
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const blockTouch = (ev: TouchEvent) => {
      if (dragIndexRef.current !== null) ev.preventDefault();
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('touchmove', blockTouch, { passive: false });
    cleanupRef.current = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('touchmove', blockTouch);
    };

    clearTimer();
    timerRef.current = window.setTimeout(() => {
      if (!startRef.current) return;
      dragIndexRef.current = index;
      setDragIndex(index);
      setGhost({ x: 0, y: 0 });
      hapticTap();
    }, LONG_PRESS_MS);
  };

  return (
    <div
      className="grid grid-cols-2 gap-2 select-none"
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
              if (movedRef.current) return;
              onSelect(animal);
            }}
            style={
              isDragging
                ? {
                    transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0) scale(1.06) rotate(1.5deg)`,
                    zIndex: 30,
                    touchAction: 'none',
                    // Laisse elementFromPoint atteindre les cartes en dessous.
                    pointerEvents: 'none',
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
              alt={speciesName(animal.name)}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              loading="lazy"
            />
            <div className="absolute top-1 right-1 pointer-events-none">
              <RarityBadge rarity={animal.rarity} />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8 pointer-events-none">
              <p className="text-xs font-display font-bold text-white truncate leading-tight">
                {speciesName(animal.name)}
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
