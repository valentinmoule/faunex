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

  const gold = readyToClaim || claimed;
  // Bande de scellage : stries verticales métallisées + reflet horizontal.
  const crimpStyle = {
    backgroundImage:
      'repeating-linear-gradient(90deg, hsl(var(--background)/0.28) 0 1px, transparent 1px 4px), ' +
      'linear-gradient(180deg, hsl(var(--background)/0.55), hsl(var(--background)/0.05) 45%, hsl(var(--foreground)/0.18))',
  } as const;

  return (
    <div className="relative w-full [filter:drop-shadow(0_18px_22px_hsl(var(--foreground)/0.28))_drop-shadow(0_4px_6px_hsl(var(--foreground)/0.18))]">
      <button
        onClick={onOpen}
        aria-label={`${title} ${captured}/${total}`}
        className="group relative block w-full aspect-[0.62] overflow-hidden text-left transition-transform active:scale-[0.97]"
        style={{ WebkitMask: CRIMP_MASK, mask: CRIMP_MASK }}
      >
        {/* Illustration pleine largeur */}
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0" style={{ background: overlay }} />

        {/* Scellage haut */}
        <div className={`absolute inset-x-0 top-0 h-[9%] ${gold ? 'bg-amber' : 'bg-primary'}`}>
          <div className="absolute inset-0" style={crimpStyle} />
          <span className="absolute inset-0 flex items-center justify-center pt-1 font-display text-[11px] font-extrabold uppercase tracking-[0.3em] text-primary-foreground [text-shadow:0_1px_2px_hsl(var(--foreground)/0.35)]">
            Faunex
          </span>
        </div>
        <div className="absolute inset-x-0 top-[9%] h-px bg-background/70" />

        {/* Scellage bas */}
        <div className="absolute inset-x-0 bottom-[7%] h-px bg-background/70" />
        <div className={`absolute inset-x-0 bottom-0 h-[7%] ${gold ? 'bg-amber' : 'bg-primary'}`}>
          <div className="absolute inset-0" style={crimpStyle} />
        </div>

        {/* Plis latéraux du sachet */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-foreground/30 via-background/15 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[7%] bg-gradient-to-l from-foreground/30 via-background/15 to-transparent" />

        {/* Reflet plastique */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,hsl(var(--background)/0.32)_40%,transparent_52%,transparent_70%,hsl(var(--background)/0.14)_80%,transparent_90%)]" />

        {(claimed || readyToClaim) && (
          <span className="absolute left-1/2 top-[12%] inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber px-2.5 py-0.5 text-[10px] font-display font-bold text-background">
            {claimed ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {t('bestiary.collections.completed')}
          </span>
        )}

        {/* Titre */}
        <div className="absolute inset-x-0 bottom-[7%] bg-gradient-to-t from-foreground/75 via-foreground/30 to-transparent px-4 pb-4 pt-16 text-center">
          <span className="block font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-background [text-shadow:0_2px_0_hsl(var(--foreground)/0.35),0_4px_12px_hsl(var(--foreground)/0.45)]">
            {title}
          </span>
          <span className="mt-2 inline-block rounded-full bg-background/90 px-3 py-0.5 font-display text-xs font-bold tabular-nums text-foreground">
            {captured}/{total}
          </span>
        </div>
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
