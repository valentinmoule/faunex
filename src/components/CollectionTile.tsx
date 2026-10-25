import { Check, Gift, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Collection présentée comme un vrai booster de cartes à collectionner :
 * illustration pleine largeur, scellages métalliques striés et crantés,
 * titre et compteur posés à plat, et ombre portée douce.
 * L'XP n'est jamais affiché ici — il est révélé à la réclamation.
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

/** Fines dents de scellage en haut et en bas du sachet. */
const CRIMP_MASK =
  'conic-gradient(from -45deg at 50% 3px, #000 90deg, transparent 0) 50% 0 / 4px 3px repeat-x, ' +
  'conic-gradient(from 135deg at 50% calc(100% - 3px), #000 90deg, transparent 0) 50% 100% / 4px 3px repeat-x, ' +
  'linear-gradient(#000 0 0) 0 3px / 100% calc(100% - 6px) no-repeat';

/** Aluminium strié : fines stries verticales + dégradé métallique + ligne spéculaire. */
const foil = (gold: boolean) => ({
  backgroundImage:
    'linear-gradient(180deg, hsl(var(--background)/0.55), transparent 30%, transparent 70%, hsl(var(--foreground)/0.30)), ' +
    'repeating-linear-gradient(90deg, hsl(var(--background)/0.22) 0 1px, transparent 1px 3px), ' +
    (gold
      ? 'linear-gradient(180deg, hsl(44 92% 78%), hsl(40 85% 58%) 40%, hsl(34 78% 44%) 75%, hsl(42 88% 66%))'
      : 'linear-gradient(180deg, hsl(var(--primary)/0.85), hsl(var(--primary)) 40%, hsl(var(--primary)/0.8) 75%, hsl(var(--primary)/0.95))'),
});

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
  const gold = readyToClaim || claimed;

  return (
    <div className="relative w-full [filter:drop-shadow(0_26px_26px_hsl(var(--foreground)/0.30))_drop-shadow(0_8px_10px_hsl(var(--foreground)/0.18))]">
      <button
        onClick={onOpen}
        aria-label={`${title} ${captured}/${total}`}
        className="group relative block w-full aspect-[0.62] overflow-hidden rounded-[14px] text-left transition-transform duration-300 active:scale-[0.97]"
        style={{ WebkitMask: CRIMP_MASK, mask: CRIMP_MASK }}
      >
        {/* Illustration pleine largeur */}
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          draggable={false}
          className="absolute inset-0 h-full w-full scale-105 object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0" style={{ background: overlay }} />

        {/* Scellage haut */}
        <div className="absolute inset-x-0 top-0 h-[5.5%]" style={foil(gold)}>
          <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/30" />
        </div>



        {(claimed || readyToClaim) && (
          <span className="absolute right-2.5 top-[8%] inline-flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 text-[9px] font-display font-bold text-background shadow">
            {claimed ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {t('bestiary.collections.completed')}
          </span>
        )}

        {/* Titre et compteur posés à plat sur le sachet, sans bandeau */}
        <div className="absolute inset-x-[7%] bottom-[8%] text-center">
          <span className="block font-display text-[17px] font-extrabold uppercase leading-tight tracking-wide text-background [text-shadow:0_1px_3px_hsl(var(--foreground)/0.9),0_0_14px_hsl(var(--foreground)/0.5)]">
            {title}
          </span>
          <span className="mt-0.5 block font-display text-[11px] font-bold tabular-nums text-background/90 [text-shadow:0_1px_2px_hsl(var(--foreground)/0.9)]">
            {captured}
            <span className="opacity-70">/ {total}</span>
          </span>
        </div>

        {/* Scellage bas */}
        <div className="absolute inset-x-0 bottom-0 h-[5.5%]" style={foil(gold)}>
          <div className="absolute inset-x-0 top-0 h-px bg-background/40" />
        </div>

        {/* Volume coussin : bords latéraux assombris, centre bombé */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--foreground)/0.34),transparent_12%,transparent_88%,hsl(var(--foreground)/0.34))]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,hsl(var(--background)/0.20),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_70%_at_50%_108%,hsl(var(--foreground)/0.30),transparent_50%)]" />

        {/* Reflets plastique */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_28%,hsl(var(--background)/0.28)_37%,hsl(var(--background)/0.06)_44%,transparent_52%)] transition-transform duration-700 group-hover:translate-x-3" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_62%,hsl(var(--background)/0.12)_70%,transparent_78%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-[7%] w-px bg-background/25" />
        <div className="pointer-events-none absolute inset-y-0 right-[7%] w-px bg-background/15" />
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
