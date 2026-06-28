import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { type Rarity } from '@/data/mockData';

interface Props {
  rarity: Rarity;
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  appearAnimation?: string;
  /** AI-generated transparent PNG of the animal — rendered ON TOP of the holo effects. */
  cutoutUrl?: string | null;
  /** Approximate normalized (0..1) bounding box of the animal — holo effects are masked around it. */
  subjectBox?: { x: number; y: number; w: number; h: number } | null;
  /** Keep pointer/touch gestures inside the card (used by fullscreen overlays). */
  containInteraction?: boolean;
  /** Kept for API compatibility (unused). */
  disableAutoShimmer?: boolean;
}

/**
 * Faunex collectible card — inspired by simeydotme/pokemon-cards-css.
 *
 * Rarity → effect mapping:
 *   common → Holofoil Rare (scanlines + chromatic bars)
 *   rare   → Reverse Holo (radial foil tracking the pointer)
 *   epic   → Cosmos / Galaxy Holo (multi-layer galaxy texture)
 *   mythic → Secret Rare (gold conic + glitter)
 *
 * Pointer drives 3D tilt + reflet (mouse + touch). On leave, everything snaps back.
 */
const HolographicCard = ({
  rarity,
  children,
  className = '',
  onTap,
  appearAnimation = '',
  cutoutUrl,
  containInteraction = false,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      rafRef.current = null;
      const node = wrapRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const py = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      const cx = px - 50;
      const cy = py - 50;
      const fromCenter = Math.min(1, Math.hypot(cx, cy) / 50);
      const s = node.style;
      s.setProperty('--pointer-x', `${px}%`);
      s.setProperty('--pointer-y', `${py}%`);
      s.setProperty('--pointer-from-center', `${fromCenter.toFixed(3)}`);
      s.setProperty('--pointer-from-top', `${(py / 100).toFixed(3)}`);
      s.setProperty('--pointer-from-left', `${(px / 100).toFixed(3)}`);
      s.setProperty('--background-x', `${(37 + (px / 100) * 26).toFixed(2)}%`);
      s.setProperty('--background-y', `${(33 + (py / 100) * 34).toFixed(2)}%`);
      s.setProperty('--rotate-x', `${(-(cx / 3.5)).toFixed(2)}deg`);
      s.setProperty('--rotate-y', `${(cy / 3.5).toFixed(2)}deg`);
      s.setProperty('--card-opacity', '1');
    };
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(apply);
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const el = wrapRef.current;
    if (!el) return;
    const s = el.style;
    s.setProperty('--pointer-x', '50%');
    s.setProperty('--pointer-y', '50%');
    s.setProperty('--pointer-from-center', '0');
    s.setProperty('--pointer-from-top', '0.5');
    s.setProperty('--pointer-from-left', '0.5');
    s.setProperty('--background-x', '50%');
    s.setProperty('--background-y', '50%');
    s.setProperty('--rotate-x', '0deg');
    s.setProperty('--rotate-y', '0deg');
    s.setProperty('--card-opacity', '0');
  }, []);

  const containEvent = useCallback((event: { stopPropagation: () => void; preventDefault?: () => void; cancelable?: boolean }) => {
    if (!containInteraction) return;
    event.stopPropagation();
    if (event.cancelable) event.preventDefault?.();
  }, [containInteraction]);

  // Random cosmos position per card so two epics never look identical
  const cosmosStyle = useMemo(
    () =>
      ({
        '--cosmos-x': `${Math.floor(Math.random() * 734)}px`,
        '--cosmos-y': `${Math.floor(Math.random() * 1280)}px`,
      }) as React.CSSProperties,
    [],
  );

  return (
    <div
      ref={wrapRef}
      className={`holo-wrap holo-${rarity} ${className} ${appearAnimation}`}
      style={cosmosStyle}
      onPointerDown={(e) => {
        containEvent(e);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        containEvent(e);
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        containEvent(e);
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        reset();
      }}
      onPointerCancel={(e) => {
        containEvent(e);
        reset();
      }}
      onMouseMove={(e) => updateFromPointer(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchStart={(e) => {
        containEvent(e);
        const t = e.touches[0];
        if (t) updateFromPointer(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        containEvent(e);
        const t = e.touches[0];
        if (t) updateFromPointer(t.clientX, t.clientY);
      }}
      onTouchEnd={(e) => {
        containEvent(e);
        reset();
      }}
      onTouchCancel={(e) => {
        containEvent(e);
        reset();
      }}
      onClick={(e) => {
        if (containInteraction) e.stopPropagation();
        onTap?.();
      }}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      <div className="holo-rotator">
        <div className="holo-card">
          <div className="holo-content">{children}</div>
          {cutoutUrl && (
            <div className="holo-cutout" aria-hidden>
              <img src={cutoutUrl} alt="" draggable={false} />
            </div>
          )}
          <div className="holo-shine" aria-hidden />
          <div className="holo-glare" aria-hidden />
        </div>
      </div>
    </div>
  );
};

export default HolographicCard;
