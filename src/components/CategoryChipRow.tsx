import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, PawPrint } from 'lucide-react';
import { categoryLabel, normalizeCategory } from '@/lib/bestiary';
import { hapticTap } from '@/lib/haptics';
import mammiferes from '@/assets/category-chips/mammiferes.webp';
import oiseaux from '@/assets/category-chips/oiseaux.webp';
import insectes from '@/assets/category-chips/insectes.webp';
import reptiles from '@/assets/category-chips/reptiles.webp';
import amphibiens from '@/assets/category-chips/amphibiens.webp';
import poissons from '@/assets/category-chips/poissons.webp';
import arachnides from '@/assets/category-chips/arachnides.webp';
import crustaces from '@/assets/category-chips/crustaces.webp';
import mollusques from '@/assets/category-chips/mollusques.webp';
import autres from '@/assets/category-chips/autres.webp';

/** Sélection « toutes les espèces ». */
export const CHIP_ALL = 'all';
/** Sélection « favoris » (même valeur que l'ancien filtre). */
export const CHIP_FAVORITES = '__favorites';

const CHIP_IMAGES: Record<string, string> = {
  Mammifères: mammiferes,
  Oiseaux: oiseaux,
  Insectes: insectes,
  Reptiles: reptiles,
  Amphibiens: amphibiens,
  Poissons: poissons,
  Arachnides: arachnides,
  Crustacés: crustaces,
  Mollusques: mollusques,
};

export const categoryChipImage = (category: string) => CHIP_IMAGES[normalizeCategory(category)] ?? autres;

interface Props {
  /** Catégories normalisées à proposer, dans l'ordre d'affichage. */
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}

const Chip = ({
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
    className="group shrink-0 flex w-[70px] flex-col items-center gap-1.5 active:scale-95 transition-transform"
  >
    <span
      className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ring-offset-2 ring-offset-background transition-shadow ${
        selected ? 'ring-[2.5px] ring-foreground' : 'ring-0'
      }`}
    >
      {children}
    </span>
    <span
      className={`max-w-full truncate text-[12px] font-display leading-tight ${
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
          <PawPrint className="h-7 w-7 text-foreground" strokeWidth={2.25} />
        </span>
      </Chip>
      <Chip
        selected={value === CHIP_FAVORITES}
        label={t('bestiary.collections.favorites')}
        onClick={() => select(CHIP_FAVORITES)}
      >
        <span className="flex h-full w-full items-center justify-center bg-chip-favorites">
          <Bookmark className="h-7 w-7 fill-foreground text-foreground" strokeWidth={2} />
        </span>
      </Chip>
      {categories.map((cat) => (
        <Chip key={cat} selected={value === cat} label={categoryLabel(cat)} onClick={() => select(cat)}>
          <img
            src={categoryChipImage(cat)}
            alt=""
            width={64}
            height={64}
            decoding="async"
            className="h-full w-full object-cover"
          />
        </Chip>
      ))}
    </div>
  );
};

export default memo(CategoryChipRow);
