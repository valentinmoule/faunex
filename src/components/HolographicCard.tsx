import { type ReactNode } from 'react';
import { type Rarity } from '@/data/mockData';

interface Props {
  rarity: Rarity;
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  appearAnimation?: string;
  /** AI-generated transparent PNG of the animal — rendered ON TOP of the holo effects
   *  so the shimmer plays between the background photo and the animal itself. */
  cutoutUrl?: string | null;
  /** Kept for backwards compatibility — animations are now always autonomous. */
  disableAutoShimmer?: boolean;
}

/**
 * Faunex collectible card — Pokémon-TCG-inspired holographic surface.
 *
 * Layer stack (z-index):
 *   0: card background
 *   1: rarity aura behind image
 *   2: image / content (background photo)
 *   3: foil grain (oily iridescence on bg)
 *   4: scan bar (sweeping rainbow on bg)
 *   5: cutout (clean animal layer — effects play BEHIND it)
 *   6: sparkle stars (in front of animal, magical)
 *   7: rim shimmer (pulses on the border)
 */
const HolographicCard = ({
  rarity,
  children,
  className = '',
  onTap,
  appearAnimation = '',
  cutoutUrl,
}: Props) => {
  const isMythic = rarity === 'mythic';
  const isEpic = rarity === 'epic';
  const isRare = rarity === 'rare';
  const isCommon = rarity === 'common';
  // Every rarity now gets some holo treatment (commons get a subtle silver shimmer).
  const hasHolo = true;
  const hasCutout = !!cutoutUrl;

  return (
    <div
      className={`holo-wrap holo-wrap-${rarity} ${className} ${appearAnimation}`}
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      {/* Outer aura halo (mythic + epic) — sits BEHIND the card */}
      {(isMythic || isEpic) && <div className={`holo-halo holo-halo-${rarity}`} aria-hidden />}

      <div className={`holo-card holo-${rarity} ${hasCutout ? 'holo-has-cutout' : ''}`}>
        {/* Rarity aura behind image */}
        {!isCommon && <div className={`holo-aura holo-aura-${rarity}`} aria-hidden />}

        {/* Image / content (background photo) */}
        <div className="holo-content">{children}</div>

        {/* AI cutout of the animal — sits IN FRONT of background */}
        {hasCutout && (
          <div className="holo-cutout" aria-hidden>
            <img src={cutoutUrl!} alt="" draggable={false} />
          </div>
        )}

        {/* Sparkles / stars — only on mythic, in front of the animal */}
        {isMythic && (
          <div className="holo-sparkles" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="holo-spark" style={{ ['--i' as never]: i } as React.CSSProperties} />
            ))}
          </div>
        )}

        {/* Pulsing rim glow */}
        <div className={`holo-rim holo-rim-${rarity}`} aria-hidden />
      </div>
    </div>
  );
};

export default HolographicCard;
