import { Check, Gift, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

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
      <div className="relative w-full">
        {/* Halo doré quand la récompense attend le joueur */}
        {readyToClaim && (
          <div
            className="absolute -inset-1.5 animate-pulse"
            style={{ clipPath: HEX, background: 'hsl(38 92% 56% / 0.45)' }}
            aria-hidden="true"
          />
        )}
        {/* Bordure hexagonale */}
        <div
          className={`relative w-full aspect-[0.92] p-[2px] transition-transform active:scale-[0.96] ${
            claimed ? 'bg-amber/70' : readyToClaim ? 'bg-amber' : 'bg-border'
          }`}
          style={{ clipPath: HEX }}
        >
          <button
            onClick={onOpen}
            className="group relative block w-full h-full overflow-hidden text-left"
            style={{ clipPath: HEX }}
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
          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber px-3 py-1 text-[11px] font-display font-bold text-background shadow-sm active:scale-95 transition disabled:opacity-60"
        >
          <Gift className="w-3 h-3" />
          {t('bestiary.collections.claimReward', { xp })}
        </button>
      ) : claimed ? (
        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-display font-semibold text-amber">
          <Check className="w-3 h-3" />
          {t('bestiary.collections.rewardClaimed', { xp })}
        </span>
      ) : (
        <span className="mt-1.5 text-[11px] font-display text-muted-foreground">
          {t('bestiary.collections.rewardHint', { xp })}
        </span>
      )}
    </div>
  );
};

export default CollectionTile;
