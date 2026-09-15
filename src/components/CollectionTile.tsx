import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import XpPill from '@/components/XpPill';

/**
 * Tuile de collection en forme d'écusson hexagonal (plus de cartes
 * rectangulaires) : illustration du biome, anneau de progression et
 * récompense XP à récupérer quand la collection est complète.
 */
export interface CollectionTileProps {
  title: string;
  image: string;
  overlay: string;
  captured: number;
  total: number;
  /** XP offerts à la complétion. */
  xp: number;
  complete: boolean;
  claimed: boolean;
  claiming?: boolean;
  onOpen: () => void;
  onClaim: () => void;
}

/**
 * Écusson hexagonal à coins arrondis (cohérent avec les rayons du reste de
 * l'app), défini en objectBoundingBox pour rester net à toutes les tailles.
 */
const ROUNDED_HEX_CLIP = 'url(#faunex-rounded-hex)';

const CollectionTile = ({
  title,
  image,
  overlay,
  captured,
  total,
  xp,
  complete,
  claimed,
  claiming,
  onOpen,
  onClaim,
}: CollectionTileProps) => {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((captured / total) * 100) : 0;
  const readyToClaim = complete && !claimed;

  return (
    <div className="flex flex-col items-center">
      {/* Définition partagée de l'écusson arrondi */}
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="faunex-rounded-hex" clipPathUnits="objectBoundingBox">
            <path d="M 42.84 3.58 Q 50 0 57.16 3.58 L 92.84 21.42 Q 100 25 100 33 L 100 67 Q 100 75 92.84 78.58 L 57.16 96.42 Q 50 100 42.84 96.42 L 7.16 78.58 Q 0 75 0 67 L 0 33 Q 0 25 7.16 21.42 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="relative w-full">
        {/* Halo doré quand la récompense attend le joueur */}
        {readyToClaim && (
          <div
            className="absolute -inset-1.5 animate-pulse"
            style={{ clipPath: ROUNDED_HEX_CLIP, background: 'hsl(38 92% 56% / 0.45)' }}
            aria-hidden="true"
          />
        )}
        {/* Bordure hexagonale */}
        <div
          className={`relative w-full aspect-[0.92] p-[2px] transition-transform active:scale-[0.96] ${
            claimed ? 'bg-amber/70' : readyToClaim ? 'bg-amber' : 'bg-border'
          }`}
          style={{ clipPath: ROUNDED_HEX_CLIP }}
        >
          <button
            onClick={onOpen}
            className="group relative block w-full h-full overflow-hidden text-left"
            style={{ clipPath: ROUNDED_HEX_CLIP }}
          >
            <img
              src={image}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0" style={{ background: overlay }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
              <span className="font-display font-black text-2xl text-primary-foreground tabular-nums drop-shadow">
                {pct}%
              </span>
              <span className="font-display text-[11px] text-primary-foreground/85 tabular-nums">
                {captured}/{total}
              </span>
            </div>
            {(claimed || readyToClaim) && (
              <span className="absolute top-[22%] left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 text-[9px] font-display font-bold text-background">
                {claimed ? <Check className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                {t('bestiary.collections.completed')}
              </span>
            )}
          </button>
        </div>
      </div>

      <h3 className="mt-2 w-full text-center font-display font-bold text-[13px] text-foreground leading-tight truncate">
        {title}
      </h3>

      {readyToClaim ? (
        <button
          onClick={onClaim}
          disabled={claiming}
          aria-label={t('bestiary.collections.claimReward', { xp })}
          className="mt-1.5 active:scale-95 transition disabled:opacity-60"
        >
          <XpPill xp={xp} state="ready" />
        </button>
      ) : claimed ? (
        <XpPill xp={xp} state="claimed" className="mt-1.5" />
      ) : (
        <XpPill xp={xp} state="locked" className="mt-1.5" />
      )}
    </div>
  );
};

export default CollectionTile;
