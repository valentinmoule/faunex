import { Gem } from 'lucide-react';

/** Pastille de niveau façon jeu mobile : gemme + numéro, relief et balayage lumineux. */
export const LevelBadge = ({ level, className }: { level: number; className?: string }) => (
  <span
    className={`level-badge ${className ?? ''}`}
    title={`Niveau ${level}`}
    aria-label={`Niveau ${level}`}
  >
    <Gem className="level-badge__icon" strokeWidth={2.25} />
    <span className="level-badge__value">{level}</span>
  </span>
);

export default LevelBadge;