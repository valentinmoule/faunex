import { type ReactNode } from 'react';
import {
  SlidersHorizontal,
  Check,
  Ghost,
  Footprints,
  Users,
  TrendingUp,
  Flame,
  Sparkles,
  Clock,
  ArrowDownAZ,
  Star,
  GripVertical,
  type LucideIcon,
  Bookmark,
} from 'lucide-react';
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

/** Compteur d'espèces par rareté (affiché à droite de chaque rareté dans la modale de filtres). */
export const countByRarity = <T extends { rarity: string }>(list: T[]): Partial<Record<Rarity, number>> => {
  const counts: Partial<Record<Rarity, number>> = {};
  for (const a of list) {
    const r = normalizeRarity(a.rarity);
    counts[r] = (counts[r] ?? 0) + 1;
  }
  return counts;
};

/** Compteur d'espèces par palier de popularité, à partir du nombre de naturalistes. */
export const countByPopularity = <T extends { finders?: number }>(list: T[]): Partial<Record<PopularityTier, number>> => {
  const counts: Partial<Record<PopularityTier, number>> = {};
  for (const a of list) {
    const tier = popularityTierOf(a.finders ?? 0);
    counts[tier] = (counts[tier] ?? 0) + 1;
  }
  return counts;
};

/** Icône vectorielle de la catégorie d'une espèce (remplace les emojis sur les cartes). */
/** Pseudo-catégorie « Favoris » dans le filtre de mes captures. */
export const FAVORITES_FILTER = '__favorites';

export const SpeciesCategoryIcon = ({ category, className }: { category: string; className?: string }) => {
  if (category === FAVORITES_FILTER) return <Bookmark className={className} />;
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

/** Icône de chaque mode de tri (une ligne par option dans le drawer). */
const SORT_ICONS: Record<string, LucideIcon> = {
  default: Sparkles,
  recent: Clock,
  alpha: ArrowDownAZ,
  rarity: Star,
  popularity: Flame,
  custom: GripVertical,
};

/** Titre de section, au-dessus d'un groupe de lignes. */
const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="px-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold">
    {children}
  </p>
);

/** Groupe de lignes : conteneur arrondi, séparateurs fins (style liste iOS). */
const ListGroup = ({
  children,
  role,
  label,
}: {
  children: ReactNode;
  role?: 'group' | 'radiogroup';
  label?: string;
}) => (
  <div
    role={role}
    aria-label={role === 'radiogroup' ? label : undefined}
    className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border"
  >
    {children}
  </div>
);

/** Ligne de sélection : icône à gauche, libellé, coche à droite (toujours réservée pour l'alignement). */
const ListRow = ({
  checked,
  onToggle,
  leading,
  label,
  trailing,
  multi,
}: {
  checked: boolean;
  onToggle: () => void;
  leading: ReactNode;
  label: string;
  trailing?: ReactNode;
  /** true = sélection multiple (aria-pressed), false = choix unique (aria-checked). */
  multi: boolean;
}) => (
  <button
    type="button"
    onClick={onToggle}
    role={multi ? undefined : 'radio'}
    aria-pressed={multi ? checked : undefined}
    aria-checked={multi ? undefined : checked}
    className="w-full flex items-center gap-3 px-4 py-3 min-h-[52px] text-left transition-colors active:bg-muted"
  >
    <span className="shrink-0 flex w-10 h-5 items-center justify-start text-muted-foreground" aria-hidden="true">
      {leading}
    </span>
    <span className="flex-1 min-w-0 truncate text-[15px] font-display font-semibold text-foreground">{label}</span>
    {trailing !== undefined && <span className="shrink-0 text-[13px] font-semibold text-muted-foreground">{trailing}</span>}
    <Check
      className={`w-[18px] h-[18px] shrink-0 text-primary transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden="true"
    />
  </button>
);

interface SpeciesSortFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tri courant ; si omis, la section tri est masquée. */
  sort?: string;
  sortOptions?: { value: string; label: string }[];
  onSortChange?: (sort: string) => void;
  rarities: Rarity[];
  onRaritiesChange: (rarities: Rarity[]) => void;
  popularities: PopularityTier[];
  onPopularitiesChange: (tiers: PopularityTier[]) => void;
  /** Section catégories affichée seulement si disponible. */
  availableCategories?: { name: string; total: number }[];
  categories?: string[];
  onCategoriesChange?: (cats: string[]) => void;
  /** Compteurs par rareté : le total s'affiche à droite, les raretés absentes sont masquées. */
  availableRarities?: Partial<Record<Rarity, number>>;
  /** Compteurs par palier de popularité (même règle d'affichage). */
  availablePopularities?: Partial<Record<PopularityTier, number>>;
  resultCount: number;
  onReset: () => void;
  /** Libellé du bouton de validation (par défaut « Voir X espèces »). */
  confirmLabel?: string;
}

/** Drawer unifié tri + filtres, identique sur toutes les listes d'espèces : listes de lignes, une option par ligne. */
export const SpeciesSortFilterSheet = ({
  open,
  onOpenChange,
  sort,
  sortOptions,
  onSortChange,
  rarities,
  onRaritiesChange,
  popularities,
  onPopularitiesChange,
  availableCategories,
  categories,
  onCategoriesChange,
  availableRarities,
  availablePopularities,
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
          <section className="mt-3">
            <SectionLabel>{t('bestiary.mine.sortLabel')}</SectionLabel>
            <ListGroup role="radiogroup" label={t('bestiary.mine.sortLabel')}>
              {sortOptions.map((opt) => {
                const Icon = SORT_ICONS[opt.value] ?? Sparkles;
                return (
                  <ListRow
                    key={opt.value}
                    multi={false}
                    checked={sort === opt.value}
                    onToggle={() => onSortChange(opt.value)}
                    leading={<Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
                    label={opt.label}
                  />
                );
              })}
            </ListGroup>
          </section>
        )}

        {availableCategories && categories !== undefined && onCategoriesChange && availableCategories.length > 0 && (
          <section className="mt-5">
            <SectionLabel>{t('bestiary.filterModal.categoriesLabel')}</SectionLabel>
            <ListGroup role="group">
              {availableCategories.map((cat) => {
                const isActive = categories.includes(cat.name);
                return (
                  <ListRow
                    key={cat.name}
                    multi
                    checked={isActive}
                    onToggle={() =>
                      onCategoriesChange(
                        isActive ? categories.filter((c) => c !== cat.name) : [...categories, cat.name],
                      )
                    }
                    leading={<SpeciesCategoryIcon category={cat.name} className="w-[18px] h-[18px]" />}
                    label={cat.name === FAVORITES_FILTER ? t('bestiary.collections.favorites') : categoryLabel(cat.name)}
                    trailing={cat.total}
                  />
                );
              })}
            </ListGroup>
          </section>
        )}

        <section className="mt-5">
          <SectionLabel>{t('bestiary.filterModal.rarityLabel')}</SectionLabel>
          <ListGroup role="group">
            {RARITY_ORDER.map((r) => {
              const total = availableRarities?.[r];
              if (availableRarities && !total) return null;
              const isActive = rarities.includes(r);
              return (
                <ListRow
                  key={r}
                  multi
                  checked={isActive}
                  onToggle={() => onRaritiesChange(isActive ? rarities.filter((x) => x !== r) : [...rarities, r])}
                  leading={<RarityBadge rarity={r} plain />}
                  label={RARITY_LABELS[r]}
                  trailing={total}
                />
              );
            })}
          </ListGroup>
        </section>

        <section className="mt-5">
          <SectionLabel>{t('bestiary.filterModal.popularityLabel')}</SectionLabel>
          <ListGroup role="group">
            {(Object.keys(POPULARITY_LABELS) as PopularityTier[]).map((tier) => {
              const isActive = popularities.includes(tier);
              const { label, Icon } = POPULARITY_LABELS[tier];
              return (
                <ListRow
                  key={tier}
                  multi
                  checked={isActive}
                  onToggle={() =>
                    onPopularitiesChange(isActive ? popularities.filter((x) => x !== tier) : [...popularities, tier])
                  }
                  leading={<Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
                  label={label}
                />
              );
            })}
          </ListGroup>
        </section>

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
