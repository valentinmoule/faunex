import { useTranslation } from 'react-i18next';
import { categoryLabel } from '@/lib/bestiary';

interface Props {
  /** Numéro d'espèce fixé à la création de la fiche. Rien ne s'affiche sans lui. */
  speciesNumber?: number | null;
  /** Grande famille de l'espèce (catégorie stockée en français). */
  category?: string | null;
  className?: string;
}

/**
 * Pastille « N° 008 · OISEAUX » posée en haut à gauche de la carte.
 * Le numéro est attribué une fois à la création de la fiche et ne change plus
 * jamais, même après un renommage ou une fusion.
 */
const SpeciesNumberBadge = ({ speciesNumber, category, className = '' }: Props) => {
  const { t } = useTranslation();
  if (!speciesNumber || speciesNumber <= 0) return null;
  const label = category?.trim() ? categoryLabel(category) : '';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 font-display text-[10px] font-bold leading-none text-foreground shadow-sm ${className}`}
    >
      <span className="tabular-nums">
        {t('bestiary.speciesNumber', { number: String(speciesNumber).padStart(3, '0') })}
      </span>
      {label && (
        <>
          <span aria-hidden="true" className="opacity-45">·</span>
          <span className="uppercase tracking-tight">{label}</span>
        </>
      )}
    </span>
  );
};

export default SpeciesNumberBadge;
