import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Rarity } from '@/data/mockData';

interface Props {
  rarity: Rarity;
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  appearAnimation?: string;
  /** Disable the mobile auto-shimmer (tilt loop). Useful in marketing layouts where rotated faces leak outside the card. */
  disableAutoShimmer?: boolean;
}

/**
 * Pokémon TCG-inspired holographic card with:
 * - 3D parallax tilt on pointer move (mouse + touch + device orientation)
 * - Glossy shine following pointer
 * - Rarity-specific holo patterns layered around the image
 *
 * Pattern layers (z-index order):
 *   0: card container (perspective)
 *   1: holo background pattern (rarity)
 *   2: image (children)
 *   3: holo overlay shine
 *   4: glossy pointer reflection
 *   5: rim highlight
 */
const HolographicCard = ({ rarity, children, className = '', onTap, appearAnimation = '', disableAutoShimmer = false }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  const rafRef = useRef<number | null>(null);

  const isMythic = rarity === 'mythic';
  const isEpic = rarity === 'epic';
  const isRare = rarity === 'rare';
  const hasHolo = isRare || isEpic || isMythic;

  // Apply tilt + glossy via CSS variables (avoid React re-render per move)
  const applyTransform = useCallback((rx: number, ry: number, mx: number, my: number, active: boolean) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rx', `${rx}deg`);
    card.style.setProperty('--ry', `${ry}deg`);
    card.style.setProperty('--mx', `${mx}%`);
    card.style.setProperty('--my', `${my}%`);
    card.style.setProperty('--active', active ? '1' : '0');
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;
    // Max tilt 14° for premium feel
    const maxTilt = 14;
    const ry = (px - 0.5) * 2 * maxTilt;
    const rx = -(py - 0.5) * 2 * maxTilt;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      applyTransform(rx, ry, px * 100, py * 100, true);
      setTilt({ rx, ry, mx: px * 100, my: py * 100, active: true });
    });
  }, [applyTransform]);

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    applyTransform(0, 0, 50, 50, false);
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  }, [applyTransform]);

  // Mobile: subtle device-orientation parallax (auto-shimmer)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only for non-touch idle: gentle auto-shimmer when not interacting
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (!isCoarse || !hasHolo || disableAutoShimmer) return;

    let frame = 0;
    let active = true;
    const tick = () => {
      if (!active) return;
      frame++;
      // Slow figure-8 motion to give the holo life on mobile
      const t = frame * 0.012;
      const ry = Math.sin(t) * 6;
      const rx = Math.sin(t * 1.3) * 4;
      const mx = 50 + Math.sin(t) * 35;
      const my = 50 + Math.cos(t * 0.8) * 35;
      if (!tilt.active) applyTransform(rx, ry, mx, my, true);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHolo, disableAutoShimmer]);

  return (
    <div
      ref={wrapRef}
      className={`holo-wrap ${className} ${appearAnimation}`}
      style={{ perspective: '1000px' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onClick={onTap}
    >
      <div
        ref={cardRef}
        className={`holo-card holo-${rarity}`}
        style={{
          transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
        }}
      >
        {/* Holo pattern layer (behind image) */}
        {hasHolo && (
          <div className={`holo-pattern holo-pattern-${rarity}`} aria-hidden />
        )}

        {/* Image / content */}
        <div className="holo-content">{children}</div>

        {/* Holo overlay layered on top of image */}
        {hasHolo && (
          <>
            <div className={`holo-foil holo-foil-${rarity}`} aria-hidden />
            <div className="holo-gloss" aria-hidden />
            <div className="holo-rim" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
};

export default HolographicCard;
