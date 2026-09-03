import { Gem } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Pastille de niveau façon jeu mobile : gemme + numéro, relief et balayage lumineux. */
export const LevelBadge = ({ level, className }: { level: number; className?: string }) => {
  const { t } = useTranslation();
  const label = t('profile.levelBadge.level', { level });
  return (
  <span
    className={`level-badge ${className ?? ''}`}
    title={label}
    aria-label={label}
  >
    <Gem className="level-badge__icon" strokeWidth={2.25} />
    <span className="level-badge__value">{level}</span>
  </span>
  );
};

export default LevelBadge;