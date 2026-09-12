import { SlidersHorizontal, Check, Ghost, Footprints, Users, TrendingUp, Flame, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import RarityBadge from '@/components/RarityBadge';
import { type Rarity, RARITY_LABELS, RARITY_ORDER, RARITY_RANK, normalizeRarity } from '@/data/mockData';
import { categoryLabel, getCategoryIcon, normalizeCategory } from '@/lib/bestiary';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

/** Filtre de popularité communautaire : combien de naturalistes ont capturé l'espèce.
 *  Seuils alignés sur FindersBadge pour une cohérence badge ↔ filtre. */
export type PopularityTier = 'none' | 'rare' | 'common' | 'trending' | 'hot';

export const POPULARITY_LABELS: Record<PopularityTier, { label: string; Icon: LucideIcon }> = {
  get none() { return { label: i18n.t('bestiary.popularity.none'), Icon: Ghost }; },
  get rare() { return { label: i18n.t('bestiary.popularity.rare'), Icon: Footprints }; },
  get common() { return { label: i18n.t('bestiary.popularity.common'), Icon: Users }; },
  get trending() { return { label: i18n.t('bestiary.popularity.trending'), Icon: TrendingUp }; },
  get hot() { return { label: i18n.t('bestiary.popularity.hot'), Icon: Flame }; },
};

export const popularityTierOf = (n: number): PopularityTier =>
  n <= 0 ? 'none' : n < 5 ? 'rare' : n < 25 ? 'common' : n < 100 ? 'trending' : 'hot';

/** Icône vectorielle de la catégorie d'une espèce (remplace les emojis sur les cartes). */
export const SpeciesCategoryIcon = ({ category, className }: { category: string; className?: string }) => {
  const Icon = getCategoryIcon(category);
  return <Icon className={className} strokeWidth={1.5} />;
};

/** Tri des listes d'espèces du catalogue (bestiaire, catégories, collections, territoires). */
export type SpeciesSort = 'default' | 'alpha' | 'rarity' | 'popularity';

export const SPECIES_SORT_OPTIONS: { value: SpeciesSort; label: string }[] = [
  { value: 'default', get label() { return i18n.t('bestiary.speciesSort.default'); } },
  { value: 'alpha', get label() { return i18n.t('bestiary.mineSort.alpha'); } },
  { value: 'rarity', get label() { return i18n.t('bestiary.mineSort.rarity'); } },
  { value: 'popularity', get label() { return i18n.t('bestiary.mineSort.popularity'); } },
];

/** Applique filtres + tri sur une liste d'espèces du catalogue. */
export const applySpeciesSortFilter = <T extends { name: string; rarity: string; category?: string | null; finders?: number }>(
  list: T[],
  opts: { sort: SpeciesSort; rarities: Rarity[]; popularities: PopularityTier[]; categories?: string[] },
): T[] => {
  const { sort, rarities, popularities, categories } = opts;
  const filtered = list.filter(
    (a) =>
      (rarities.length === 0 || rarities.includes(normalizeRarity(a.rarity))) &&
      (popularities.length === 0 || popularities.includes(popularityTierOf(a.finders ?? 0))) &&
      (!categories || categories.length === 0 || categories.includes(normalizeCategory(a.category || ''))),
  );
  if (sort === 'alpha') return filtered.sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  if (sort === 'rarity')
    return filtered.sort(
      (a, b) => (RARITY_RANK[normalizeRarity(b.rarity)] ?? 99) - (RARITY_RANK[normalizeRarity(a.rarity)] ?? 99),
    );
  if (sort === 'popularity') return filtered.sort((a, b) => (b.finders ?? 0) - (a.finders ?? 0));
  return filtered;
};

/** Bouton d'ouverture du drawer tri + filtres : icône seule, pastille si des filtres sont actifs. */
export const SpeciesFilterButton = ({
  active,
  count,
  onClick,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      aria-label={t('bestiary.mine.sortAndFilter')}
      className={`relative shrink-0 flex items-center justify-center w-[42px] h-[42px] rounded-xl border transition-all active:scale-[0.95] ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-foreground border-border hover:border-primary/40'
      }`}
    >
      <SlidersHorizontal className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber text-amber-dark text-[10px] font-bold flex items-center justify-center shadow-sm">
          {count}
        </span>
      )}
    </button>
  );
};

interface SpeciesSortFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tri courant ; si omis, la section tri est masquée. */
  sort?: string;
  sortOptions?: { value: string; label: string }[];
  onSortChange?: (sort: string) => void;
  sortHint?: string;
  rarities: Rarity[];
  onRaritiesChange: (rarities: Rarity[]) => void;
  popularities: PopularityTier[];
  onPopularitiesChange: (tiers: PopularityTier[]) => void;
  /** Section catégories affichée seulement si disponible. */
  availableCategories?: { name: string; total: number }[];
  categories?: string[];
  onCategoriesChange?: (cats: string[]) => void;
  resultCount: number;
  onReset: () => void;
  /** Libellé du bouton de validation (par défaut « Voir X espèces »). */
  confirmLabel?: string;
}

/** Drawer unifié tri + filtres, identique sur toutes les listes d'espèces. */
export const SpeciesSortFilterSheet = ({
  open,
  onOpenChange,
  sort,
  sortOptions,
  onSortChange,
  sortHint,
  rarities,
  onRaritiesChange,
  popularities,
  onPopularitiesChange,
  availableCategories,
  categories,
  onCategoriesChange,
  resultCount,
  onReset,
  confirmLabel,
}: SpeciesSortFilterSheetProps) => {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            {t('bestiary.mine.sortFilterModalTitle')}
          </SheetTitle>
        </SheetHeader>

        {sort !== undefined && sortOptions && onSortChange && (
          <>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-3 mb-2">
              {t('bestiary.mine.sortLabel')}
            </p>
            <div className="space-y-2">
              {sortOptions.map((opt) => {
                const isActive = sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onSortChange(opt.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-display font-semibold transition active:scale-[0.98] ${
                      isActive ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-foreground'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
              {sortHint && <p className="pt-1 text-[11px] font-display text-muted-foreground">{sortHint}</p>}
            </div>
          </>
        )}

        {availableCategories && categories !== undefined && onCategoriesChange && availableCategories.length > 0 && (
          <>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-5 mb-2">
              {t('bestiary.filterModal.categoriesLabel')}
            </p>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => {
                const isActive = categories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    onClick={() =>
                      onCategoriesChange(
                        isActive ? categories.filter((c) => c !== cat.name) : [...categories, cat.name],
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-semibold border transition-all active:scale-95 ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    <SpeciesCategoryIcon category={cat.name} className="w-4 h-4" />
                    {categoryLabel(cat.name)}
                    <span className={isActive ? 'opacity-80' : 'opacity-50'}>{cat.total}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-5 mb-2">
          {t('bestiary.filterModal.rarityLabel')}
        </p>
        <div className="flex flex-wrap gap-2">
          {RARITY_ORDER.map((r) => {
            const isActive = rarities.includes(r);
            return (
              <button
                key={r}
                onClick={() =>
                  onRaritiesChange(isActive ? rarities.filter((x) => x !== r) : [...rarities, r])
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-semibold border transition-all active:scale-95 ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/40'
                }`}
              >
                <RarityBadge rarity={r} />
                {RARITY_LABELS[r]}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-5 mb-2">
          {t('bestiary.filterModal.popularityLabel')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(POPULARITY_LABELS) as PopularityTier[]).map((tier) => {
            const isActive = popularities.includes(tier);
            const { label, Icon } = POPULARITY_LABELS[tier];
            return (
              <button
                key={tier}
                onClick={() =>
                  onPopularitiesChange(isActive ? popularities.filter((x) => x !== tier) : [...popularities, tier])
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-semibold border transition-all active:scale-95 ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={onReset}
            className="flex-1 py-3 rounded-xl border border-border bg-card text-sm font-display font-semibold text-muted-foreground active:scale-[0.98] transition"
          >
            {t('bestiary.filterModal.reset')}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-display font-bold active:scale-[0.98] transition"
          >
            {confirmLabel ?? t('bestiary.filterModal.seeSpecies', { count: resultCount })}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
