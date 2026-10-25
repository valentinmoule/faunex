import { Check, Gift, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

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

const CollectionTile = ({
  title,
  image,
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
    <div className={`collection-booster relative w-full rounded-[7px] ${gold ? 'collection-booster-gold' : ''}`}>
      <Button
        variant="ghost"
        onClick={onOpen}
        aria-label={`${title} ${captured}/${total}`}
        className="collection-booster-face relative block h-auto w-full aspect-[0.56] overflow-hidden p-0 text-left whitespace-normal hover:bg-transparent [&_svg]:size-3"
      >
        {/* Illustration pleine largeur */}
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="collection-booster-print absolute inset-0" />

        {/* Scellage haut */}
        <div className="collection-booster-seal absolute inset-x-0 top-0 h-[7%]" />



        {(claimed || readyToClaim) && (
          <span className="absolute right-2.5 top-[8%] inline-flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 text-[9px] font-display font-bold text-background shadow">
            {claimed ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {t('bestiary.collections.completed')}
          </span>
        )}

        {/* Titre et compteur posés à plat sur le sachet, sans bandeau */}
        <div className="absolute inset-x-[10%] bottom-[9%] z-10 text-center">
          <span className="collection-booster-title block">
            {title}
          </span>
          <span className="collection-booster-count mt-3 block font-display text-xs font-medium tabular-nums">
            {captured}
            <span className="opacity-70">/ {total}</span>
          </span>
        </div>

        {/* Scellage bas */}
        <div className="collection-booster-seal absolute inset-x-0 bottom-0 h-[3.5%]" />

        {/* Volume coussin : bords latéraux assombris, centre bombé */}
        <div className="collection-booster-volume pointer-events-none absolute inset-0" />

        {/* Reflets plastique */}
        <div className="collection-booster-gloss pointer-events-none absolute inset-0" />
      </Button>

      {readyToClaim && (
        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
          <Button
            onClick={onClaim}
            disabled={claiming}
            aria-label={t('bestiary.collections.claim')}
            className="inline-flex items-center gap-1 rounded-full border border-amber/40 bg-amber px-3.5 py-1.5 text-xs font-display font-bold text-background shadow-md transition active:scale-95 disabled:opacity-60"
          >
            <Gift className="h-3.5 w-3.5" />
            {t('bestiary.collections.claim')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CollectionTile;
