import type { ReactNode } from 'react';

interface GameCounterProps {
  /** Emblème de l'indicateur (icône de graine, appareil photo…). */
  icon: ReactNode;
  /** Valeur affichée : un nombre, ou un symbole pour les abonnés. */
  value: ReactNode;
  /** Libellé lu par les lecteurs d'écran. */
  label: string;
  /** Appui (ouvrir la page Graines ou Premium) ; absent = simple affichage. */
  onClick?: () => void;
  title?: string;
}

/** Petit compteur en relief : un emblème suivi d'une valeur, comme sur Apprendre. */
const GameCounter = ({ icon, value, label, onClick, title }: GameCounterProps) => {
  const inner = (
    <>
      <span className="capture-game-emblem flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-[18px] text-center font-display text-sm font-extrabold tabular-nums text-primary">
        {value}
      </span>
    </>
  );

  const className = 'capture-game-counter flex h-9 shrink-0 items-center gap-1.5 px-1 press';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={label} title={title}>
        {inner}
      </button>
    );
  }

  return (
    <div className={className} aria-label={label} title={title}>
      {inner}
    </div>
  );
};

export default GameCounter;
