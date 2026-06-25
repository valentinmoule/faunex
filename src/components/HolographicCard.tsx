import { type ReactNode } from 'react';
import { type Rarity } from '@/data/mockData';

interface Props {
  rarity: Rarity;
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  appearAnimation?: string;
  /** Kept for backwards compatibility — animations are now always autonomous. */
  disableAutoShimmer?: boolean;
}

/**
 * Faunex collectible card — Pokémon-TCG-inspired holographic surface.
 *
 * Fully autonomous animations (no pointer parallax, mobile-first):
 *   - Iridescent oily grain that scrolls slowly
 *   - Diagonal rainbow scan bar sweeping across the card
 *   - Rarity-specific aura / conic spin / sparkle stars
 *   - Continuous rim shimmer that pulses
 *
 * Layer stack (z-index):
 *   1: rarity aura / pattern behind image
 *   2: image / content
 *   3: foil grain (oily iridescence)
 *   4: scan bar (sweeping rainbow)
 *   5: sparkle stars (mythic) / glints (epic, rare)
 *   6: rim shimmer
 *   7: outer glow halo (mythic / epic)
 */
const HolographicCard = ({ rarity, children, className = '', onTap, appearAnimation = '' }: Props) => {
  const isMythic = rarity === 'mythic';
  const isEpic = rarity === 'epic';
  const isRare = rarity === 'rare';
  const hasHolo = isRare || isEpic || isMythic;

  return (
    <div
      className={`holo-wrap holo-wrap-${rarity} ${className} ${appearAnimation}`}
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      {/* Outer aura halo (mythic + epic) — sits BEHIND the card */}
      {(isMythic || isEpic) && <div className={`holo-halo holo-halo-${rarity}`} aria-hidden />}

      <div className={`holo-card holo-${rarity}`}>
        {/* Rarity aura behind image */}
        {hasHolo && <div className={`holo-aura holo-aura-${rarity}`} aria-hidden />}

        {/* Image / content */}
        <div className="holo-content">{children}</div>

        {/* Oily iridescent grain on top of image */}
        {hasHolo && <div className={`holo-grain holo-grain-${rarity}`} aria-hidden />}

        {/* Pokémon-style diagonal rainbow scan */}
        {hasHolo && <div className={`holo-scan holo-scan-${rarity}`} aria-hidden />}

        {/* Sparkles / stars */}
        {isMythic && (
          <div className="holo-sparkles" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="holo-spark" style={{ ['--i' as never]: i } as React.CSSProperties} />
            ))}
          </div>
        )}
        {isEpic && (
          <div className="holo-sparkles holo-sparkles-epic" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="holo-spark" style={{ ['--i' as never]: i } as React.CSSProperties} />
            ))}
          </div>
        )}
        {isRare && (
          <div className="holo-sparkles holo-sparkles-rare" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="holo-spark" style={{ ['--i' as never]: i } as React.CSSProperties} />
            ))}
          </div>
        )}

        {/* Pulsing rim glow */}
        {hasHolo && <div className={`holo-rim holo-rim-${rarity}`} aria-hidden />}
      </div>
    </div>
  );
};

export default HolographicCard;
