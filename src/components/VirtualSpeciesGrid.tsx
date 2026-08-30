import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

interface VirtualSpeciesGridProps<T> {
  items: T[];
  /** Nombre de colonnes de la grille. */
  columns?: number;
  /** Espacement entre les cartes (px), doit matcher la classe `gap-*`. */
  gap?: number;
  /** Ratio largeur/hauteur des cartes (ex. 3/4). */
  aspectRatio?: number;
  /** Lignes rendues en plus au-dessus et en-dessous du viewport. */
  overscanRows?: number;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Index à amener au centre du viewport (ex. animation de rangement). */
  scrollToIndex?: number | null;
}

/**
 * Grille virtualisée basée sur le scroll de la fenêtre : seules les lignes
 * visibles (+ overscan) sont montées dans le DOM. La mémoire reste constante
 * quel que soit le nombre d'espèces (5 000+).
 */
export function VirtualSpeciesGrid<T>({
  items,
  columns = 3,
  gap = 8,
  aspectRatio = 3 / 4,
  overscanRows = 3,
  getKey,
  renderItem,
  scrollToIndex = null,
}: VirtualSpeciesGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState({ start: 0, end: columns * 12 });

  // Largeur du conteneur → hauteur de ligne
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cardWidth = width > 0 ? (width - gap * (columns - 1)) / columns : 0;
  const rowHeight = cardWidth > 0 ? cardWidth / aspectRatio + gap : 0;
  const rowCount = Math.ceil(items.length / columns);
  const totalHeight = rowCount > 0 && rowHeight > 0 ? rowCount * rowHeight - gap : 0;

  // Calcul des lignes visibles à chaque scroll / resize
  useEffect(() => {
    if (rowHeight <= 0) return;
    let frame = 0;
    const compute = () => {
      frame = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const first = Math.floor((-rect.top) / rowHeight) - overscanRows;
      const visibleRows = Math.ceil(viewport / rowHeight) + overscanRows * 2;
      const startRow = Math.max(0, first);
      const endRow = Math.min(rowCount, startRow + visibleRows);
      const start = startRow * columns;
      const end = Math.min(items.length, endRow * columns);
      setRange(prev => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [rowHeight, rowCount, columns, items.length, overscanRows]);

  // Scroll programmé vers une carte précise (la virtualisation la montera ensuite)
  const scrolledToRef = useRef<number | null>(null);
  useEffect(() => {
    if (scrollToIndex == null || scrollToIndex < 0 || rowHeight <= 0) return;
    if (scrolledToRef.current === scrollToIndex) return;
    const el = containerRef.current;
    if (!el) return;
    scrolledToRef.current = scrollToIndex;
    const rect = el.getBoundingClientRect();
    const rowTop = Math.floor(scrollToIndex / columns) * rowHeight;
    const target = window.scrollY + rect.top + rowTop - (window.innerHeight - rowHeight) / 2;
    window.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
  }, [scrollToIndex, rowHeight, columns]);

  const slice = useMemo(
    () => items.slice(range.start, range.end),
    [items, range.start, range.end],
  );

  const offsetTop = rowHeight > 0 ? Math.floor(range.start / columns) * rowHeight : 0;

  return (
    <div ref={containerRef} style={{ height: totalHeight || undefined, position: 'relative' }}>
      <div
        style={{
          transform: `translate3d(0, ${offsetTop}px, 0)`,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gap}px`,
          willChange: 'transform',
        }}
      >
        {slice.map((item, i) => (
          <div key={getKey(item, range.start + i)}>{renderItem(item, range.start + i)}</div>
        ))}
      </div>
    </div>
  );
}
