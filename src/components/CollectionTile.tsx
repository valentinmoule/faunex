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
            <path d="M .4284 .0358 Q .5 0 .5716 .0358 L .9284 .2142 Q 1 .25 1 .33 L 1 .67 Q 1 .75 .9284 .7858 L .5716 .9642 Q .5 1 .4284 .9642 L .0716 .7858 Q 0 .75 0 .67 L 0 .33 Q 0 .25 .0716 .2142 Z" />
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

            {/* Curseur de progression : jauge verticale + repère de position */}
            <div
              className="absolute left-[13%] top-[24%] bottom-[26%] w-[5px] rounded-full bg-primary-foreground/25"
              aria-hidden="true"
            >
              <div
                className={`absolute bottom-0 left-0 w-full rounded-full transition-[height] duration-500 ${
                  readyToClaim ? 'bg-amber' : 'bg-primary-foreground/90'
                }`}
                style={{ height: `${pct}%` }}
              />
              <div
                className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm transition-[top] duration-500 ${
                  readyToClaim ? 'bg-amber' : claimed ? 'bg-amber' : 'bg-primary-foreground'
                }`}
                style={{ top: `${100 - pct}%` }}
              />
            </div>

            {/* Progression au centre, légèrement au-dessus de la pastille XP */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pb-[14%] pl-5 pr-3 text-center">
              <span className="font-display font-black text-2xl text-primary-foreground tabular-nums drop-shadow">
                {pct}%
              </span>
              <span className="font-display text-[11px] text-primary-foreground/85 tabular-nums">
                {captured}/{total}
              </span>
            </div>

            {(claimed || readyToClaim) && (
              <span className="absolute top-[20%] left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 text-[9px] font-display font-bold text-background">
                {claimed ? <Check className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                {t('bestiary.collections.completed')}
              </span>
            )}
          </button>

        </div>

        {/* Pastille XP posée en bas de l'écusson, hors de la zone détourée
            pour ne jamais être rognée (masquée une fois réclamée) */}
        {(readyToClaim || !claimed) && (
          <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
            {readyToClaim ? (
              <button
                onClick={onClaim}
                disabled={claiming}
                aria-label={t('bestiary.collections.claimReward', { xp })}
                className="block rounded-full shadow-md drop-shadow transition active:scale-95 disabled:opacity-60"
              >
                <XpPill xp={xp} state="ready" />
              </button>
            ) : (
              <XpPill xp={xp} state="locked" className="pointer-events-none shadow-md drop-shadow" />
            )}
          </div>
        )}
      </div>

      <h3 className="mt-4 w-full text-center font-display font-bold text-[13px] text-foreground leading-tight truncate">
        {title}
      </h3>
    </div>
  );
};

export default CollectionTile;
