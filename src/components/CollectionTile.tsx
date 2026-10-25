import { Check, Gift, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Collection présentée comme un booster de cartes : sachet aux bords
 * crantés, reflet métallisé, illustration plein cadre, titre sur bandeau
 * et compteur. Bouton de réclamation quand la collection est complète
 * (l'XP n'est jamais affiché ici — il est révélé à la réclamation).
 */
export interface CollectionTileProps {
  title: string;
  image: string;
  overlay: string;
  captured: number;
  total: number;
  complete: boolean;
  claimed: boolean;
  claiming?: boolean;
  onOpen: () => void;
  onClaim: () => void;
}

/** Dents de scellage en haut et en bas du sachet. */
const CRIMP_MASK =
  'conic-gradient(from -45deg at 50% 6px, #000 90deg, transparent 0) 50% 0 / 8px 6px repeat-x, ' +
  'conic-gradient(from 135deg at 50% calc(100% - 6px), #000 90deg, transparent 0) 50% 100% / 8px 6px repeat-x, ' +
  'linear-gradient(#000 0 0) 0 6px / 100% calc(100% - 12px) no-repeat';

const CollectionTile = ({
  title,
  image,
  overlay,
  captured,
  total,
  complete,
  claimed,
  claiming,
  onOpen,
  onClaim,
}: CollectionTileProps) => {
  const { t } = useTranslation();
  const readyToClaim = complete && !claimed;

  return (
    <div className="relative w-full">
      <button
        onClick={onOpen}
        aria-label={`${title} ${captured}/${total}`}
        className="group relative block w-full aspect-[0.64] text-left transition-transform active:scale-[0.97]"
        style={{ WebkitMask: CRIMP_MASK, mask: CRIMP_MASK }}
      >
        {/* Sachet : bandes de scellage métallisées */}
        <div className={`absolute inset-0 ${readyToClaim || claimed ? 'bg-amber' : 'bg-primary'}`} />
        <div className="absolute inset-x-0 top-0 h-[11%] bg-gradient-to-b from-primary-foreground/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[11%] bg-gradient-to-t from-primary-foreground/30 to-transparent" />

        {/* Illustration de la collection */}
        <div className="absolute inset-x-[5%] top-[10%] bottom-[10%] overflow-hidden rounded-md">
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0" style={{ background: overlay }} />
          {/* Reflet foil */}
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,hsl(var(--primary-foreground)/0.35)_45%,transparent_60%)] mix-blend-overlay" />

          {(claimed || readyToClaim) && (
            <span className="absolute left-1/2 top-3 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber px-2.5 py-0.5 text-[10px] font-display font-bold text-background">
              {claimed ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              {t('bestiary.collections.completed')}
            </span>
          )}

          {/* Bandeau titre */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent px-3 pb-4 pt-12 text-center">
            <span className="block font-display text-xl font-extrabold leading-tight text-background [text-shadow:0_2px_6px_rgb(0_0_0/0.5)]">
              {title}
            </span>
            <span className="mt-1 inline-block rounded-full bg-background/90 px-3 py-0.5 font-display text-xs font-bold tabular-nums text-foreground">
              {captured}/{total}
            </span>
          </div>
        </div>

        {/* Marque en tête du sachet */}
        <span className="absolute left-1/2 top-[3.2%] -translate-x-1/2 font-display text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary-foreground">
          Faunex
        </span>
      </button>

      {readyToClaim && (
        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
          <button
            onClick={onClaim}
            disabled={claiming}
            aria-label={t('bestiary.collections.claim')}
            className="inline-flex items-center gap-1 rounded-full border border-amber/40 bg-amber px-3.5 py-1.5 text-xs font-display font-bold text-background shadow-md transition active:scale-95 disabled:opacity-60"
          >
            <Gift className="h-3.5 w-3.5" />
            {t('bestiary.collections.claim')}
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionTile;
