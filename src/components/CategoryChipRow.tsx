import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PawIcon, BookmarkLeafIcon } from '@/components/nav/NavIcons';
import { categoryLabel, normalizeCategory } from '@/lib/bestiary';
import { hapticTap } from '@/lib/haptics';
import CategoryChipIcon from '@/components/CategoryChipIcon';

/** Sélection « toutes les espèces ». */
export const CHIP_ALL = 'all';
/** Sélection « favoris » (même valeur que l'ancien filtre). */
export const CHIP_FAVORITES = '__favorites';

interface Props {
  /** Catégories normalisées à proposer, dans l'ordre d'affichage. */
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}

export const Chip = ({
  selected,
  label,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
    className="group shrink-0 flex w-[82px] flex-col items-center gap-1.5 press"
  >
    <span
      className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ring-offset-2 ring-offset-background transition-shadow ${
        selected ? 'ring-[2.5px] ring-foreground' : 'ring-0'
      }`}
    >
      {children}
    </span>
    <span
      className={`line-clamp-2 max-w-full break-normal text-center text-[12px] font-display leading-tight ${
        selected ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'
      }`}
    >
      {label}
    </span>
  </button>
);

/** Rangée horizontale de pastilles rondes : Tout, Favoris, puis une par grande catégorie. */
const CategoryChipRow = ({ categories, value, onChange }: Props) => {
  const { t } = useTranslation();
  const select = (next: string) => {
    if (next === value) return;
    hapticTap();
    onChange(next);
  };
  return (
    <div
      role="radiogroup"
      aria-label={t('bestiary.chips.label')}
      className="no-scrollbar -mx-3 mb-3 flex gap-1 overflow-x-auto px-3 pt-1 pb-0.5"
    >
      <Chip selected={value === CHIP_ALL} label={t('bestiary.chips.all')} onClick={() => select(CHIP_ALL)}>
        <span className="flex h-full w-full items-center justify-center bg-chip-all">
          <PawIcon className="h-8 w-8 text-foreground" />
        </span>
      </Chip>
      <Chip
        selected={value === CHIP_FAVORITES}
        label={t('bestiary.collections.favorites')}
        onClick={() => select(CHIP_FAVORITES)}
      >
        <span className="flex h-full w-full items-center justify-center bg-chip-favorites">
          <BookmarkLeafIcon className="h-8 w-8 text-foreground" />
        </span>
      </Chip>
      {categories.map((cat) => (
        <Chip key={cat} selected={value === cat} label={categoryLabel(cat)} onClick={() => select(cat)}>
          <CategoryChipIcon category={cat} />
        </Chip>
      ))}
    </div>
  );
};

export default memo(CategoryChipRow);
