import { Check, Gift, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Collection présentée comme un vrai booster de cartes : sachet aluminium
 * aux scellages striés et crantés, volume « coussin », illustration pleine
 * largeur, logo en tête, titre sur un écusson et bandeau inférieur.
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

/** Fines dents de scellage en haut et en bas, coins très légèrement pincés. */
const CRIMP_MASK =
  'conic-gradient(from -45deg at 50% 4px, #000 90deg, transparent 0) 50% 0 / 5px 4px repeat-x, ' +
  'conic-gradient(from 135deg at 50% calc(100% - 4px), #000 90deg, transparent 0) 50% 100% / 5px 4px repeat-x, ' +
  'linear-gradient(#000 0 0) 0 4px / 100% calc(100% - 8px) no-repeat';

/** Aluminium : stries verticales + dégradé métallique. */
const foil = (gold: boolean) => ({
  backgroundImage:
    'repeating-linear-gradient(90deg, hsl(var(--foreground)/0.10) 0 1px, hsl(var(--background)/0.18) 1px 2px, transparent 2px 3px), ' +
    (gold
      ? 'linear-gradient(180deg, hsl(42 90% 82%), hsl(38 80% 56%) 35%, hsl(32 75% 40%) 60%, hsl(40 85% 70%) 85%, hsl(34 70% 46%))'
      : 'linear-gradient(180deg, hsl(var(--primary)/0.55), hsl(var(--primary)) 35%, hsl(var(--primary)/0.75) 60%, hsl(var(--primary)/0.95) 85%, hsl(var(--primary)/0.7))'),
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
    <div className="relative w-full [filter:drop-shadow(0_22px_24px_hsl(var(--foreground)/0.26))_drop-shadow(0_6px_8px_hsl(var(--foreground)/0.16))]">
      <button
        onClick={onOpen}
        aria-label={`${title} ${captured}/${total}`}
        className="group relative block w-full aspect-[0.6] overflow-hidden text-left transition-transform duration-300 active:scale-[0.97]"
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
        <div className="absolute inset-x-0 top-0 h-[7.5%]" style={foil(gold)}>
          <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/25" />
        </div>
        <div className="absolute inset-x-0 top-[7.5%] h-[3px] bg-gradient-to-b from-foreground/30 to-transparent" />

        {/* Logo */}
        <div className="absolute inset-x-0 top-[11%] flex flex-col items-center">
          <span
            className="font-display text-[26px] font-black uppercase italic leading-none tracking-tight text-background"
            style={{
              WebkitTextStroke: '1.5px hsl(var(--foreground)/0.55)',
              textShadow: '0 3px 0 hsl(var(--primary)), 0 6px 14px hsl(var(--foreground)/0.45)',
            }}
          >
            Faunex
          </span>
          <span className="mt-1.5 rounded-sm bg-foreground/70 px-2 py-[1px] font-display text-[8px] font-bold uppercase tracking-[0.2em] text-background">
            {t('bestiary.collections.title', { defaultValue: 'Collection' })}
          </span>
        </div>

        {(claimed || readyToClaim) && (
          <span className="absolute right-3 top-[9.5%] inline-flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 text-[9px] font-display font-bold text-background shadow">
            {claimed ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {t('bestiary.collections.completed')}
          </span>
        )}

        {/* Écusson titre */}
        <div className="absolute inset-x-0 bottom-[7%] flex flex-col items-center bg-gradient-to-t from-foreground/70 via-foreground/25 to-transparent px-4 pb-3 pt-20">
          <div
            className="relative max-w-[92%] rounded-xl px-4 py-2 text-center"
            style={{
              ...foil(true),
              boxShadow: 'inset 0 1px 0 hsl(var(--background)/0.7), inset 0 -2px 0 hsl(var(--foreground)/0.25), 0 6px 14px hsl(var(--foreground)/0.4)',
            }}
          >
            <div className="rounded-lg bg-foreground/80 px-3 py-1.5">
              <span className="block font-display text-lg font-extrabold uppercase leading-tight tracking-tight text-background">
                {title}
              </span>
            </div>
          </div>
        </div>

        {/* Scellage bas avec bandeau */}
        <div className="absolute inset-x-0 bottom-0 flex h-[7%] items-center justify-between px-3" style={foil(gold)}>
          <div className="absolute inset-x-0 top-0 h-px bg-background/40" />
          <span className="relative inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-background [text-shadow:0_1px_1px_hsl(var(--foreground)/0.5)]">
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/90 px-1 text-[9px] tabular-nums text-foreground [text-shadow:none]">
              {captured}
            </span>
            / {total}
          </span>
          <span className="relative h-3 w-3 rounded-full border-2 border-background/80 bg-foreground/40" />
        </div>

        {/* Volume coussin : bords latéraux assombris, centre bombé */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--foreground)/0.38),hsl(var(--background)/0.10)_5%,transparent_14%,transparent_86%,hsl(var(--background)/0.10)_95%,hsl(var(--foreground)/0.38))]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_45%,transparent_60%,hsl(var(--foreground)/0.22))]" />

        {/* Reflets plastique */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,hsl(var(--background)/0.30)_33%,transparent_42%,transparent_64%,hsl(var(--background)/0.14)_72%,transparent_80%)] transition-transform duration-700 group-hover:translate-x-4" />
        <div className="pointer-events-none absolute inset-y-0 left-[9%] w-px bg-background/25" />
        <div className="pointer-events-none absolute inset-y-0 right-[9%] w-px bg-background/15" />
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
