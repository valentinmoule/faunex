import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CollectionHero } from '@/components/CollectionHero';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bell, ChevronLeft, PawPrint, Plus, Search, Trash2, X, Building2, Map as MapIcon, Compass, Layers, Loader2, Crown, Globe, SlidersHorizontal, Users, ArrowDownUp, Check, Ghost, Footprints, TrendingUp, Flame, type LucideIcon } from 'lucide-react';
import { type Rarity, type AnimalCard, RARITY_LABELS, RARITY_ORDER, RARITY_RANK, normalizeRarity } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CardDetailSheet from '@/components/CardDetailSheet';
import RarityBadge from '@/components/RarityBadge';
import LevelBadge from '@/components/LevelBadge';
import FindersBadge from '@/components/FindersBadge';
import MyCapturesGrid from '@/components/MyCapturesGrid';

import LoadingScreen from '@/components/LoadingScreen';
import { DEPARTEMENTS, getDepartement } from '@/data/departements';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  buildCityAnimalSet,
getCategoryEmoji,
  getCategoryIcon,
  type BestiaryAnimal,
  normalizeCategory,
rarityBorderColor,
  rarityDot,
  type ZoneSub,
} from '@/lib/bestiary';
import { getCollectionArt, getZoneArt } from '@/lib/collectionArt';

import { MIN_BREEDS_PER_GROUP, BREED_GROUPS, getBreedGroup, getSpeciesGroup, type BreedGroup } from '@/lib/breedGroups';
import { useBestiaryData } from '@/hooks/useBestiaryData';
import { useCitySearch } from '@/hooks/useCitySearch';
import { useShelveAnimation } from '@/hooks/useShelveAnimation';
import { VirtualSpeciesGrid } from '@/components/VirtualSpeciesGrid';
import { useZoneSubscriptions } from '@/hooks/useZoneSubscriptions';
import { useSpeciesCollections } from '@/hooks/useSpeciesCollections';
import CategoryLeaderboard from '@/components/CategoryLeaderboard';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

/** Zones + collections combinées, limite gratuite. */
const FREE_SLOT_LIMIT = 5;

/** Catégorie virtuelle regroupant toutes les espèces + classement général. */
const ALL_SPECIES = 'Toutes les espèces';
const ALL_GRID_LIMIT = 200;

/** Tri de l'onglet « Mes captures ». */
type MineSort = 'recent' | 'alpha' | 'rarity' | 'custom';

const MINE_SORT_LABELS: Record<MineSort, string> = {
  recent: 'Plus récentes',
  alpha: 'Ordre alphabétique',
  rarity: 'Plus rares',
  custom: 'Personnalisé',
};

// Ordre de rareté décroissant : mythique en premier
const RARITY_SORT_ORDER: Record<string, number> = RARITY_RANK;

const sortStorageKey = (uid: string) => `faunex:mine-sort:${uid}`;
const orderStorageKey = (uid: string) => `faunex:mine-order:${uid}`;

/** Filtre de popularité communautaire : combien de naturalistes ont capturé l'espèce.
 *  Seuils alignés sur FindersBadge pour une cohérence badge ↔ filtre. */
type PopularityTier = 'none' | 'rare' | 'common' | 'trending' | 'hot';

const POPULARITY_LABELS: Record<PopularityTier, { label: string; Icon: LucideIcon }> = {
  none: { label: 'Jamais capturée', Icon: Ghost },
  rare: { label: 'Peu capturée', Icon: Footprints },
  common: { label: 'Populaire', Icon: Users },
  trending: { label: 'Très populaire', Icon: TrendingUp },
  hot: { label: 'Incontournable', Icon: Flame },
};

const popularityTierOf = (n: number): PopularityTier =>
  n <= 0 ? 'none' : n < 5 ? 'rare' : n < 25 ? 'common' : n < 100 ? 'trending' : 'hot';


/** Socle coloré (profondeur "jeu mobile") selon la rareté. */
const tileDepthClass: Record<string, string> = {
  uncommon: 'game-tile--uncommon',
  rare: 'game-tile--rare',
  very_rare: 'game-tile--very-rare',
  ultra_rare: 'game-tile--silver',
  illustration_rare: 'game-tile--gold',
  special_rare: 'game-tile--gold',
  hyper_rare: 'game-tile--hyper',
};

/** Icône vectorielle de la catégorie d'une espèce (remplace les emojis sur les cartes). */
const SpeciesCategoryIcon = ({ category, className }: { category: string; className?: string }) => {
  const Icon = getCategoryIcon(category);
  return <Icon className={className} strokeWidth={1.5} />;
};


/** Carte d'espèce de la grille Bestiaire, mémoïsée : les lots déjà affichés
 *  ne se re-rendent pas quand les 50 suivantes arrivent. */
const BrowseSpeciesCard = memo(
  ({ animal, onSelect }: { animal: BestiaryAnimal; onSelect: (a: BestiaryAnimal) => void }) => (
    <div
      onClick={() => onSelect(animal)}
      className={`game-tile relative aspect-[3/4] rounded-xl border-2 overflow-hidden cursor-pointer ${
        animal.captured
          ? `${rarityBorderColor[animal.rarity] || 'border-border'} bg-card ${tileDepthClass[animal.rarity] || ''}`
          : 'game-tile--empty border-border/40 bg-muted/30'
      }`}
    >

      {animal.captured && animal.captureData ? (
        <>
          <img
            src={animal.captureData.image}
            alt={animal.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute top-1.5 left-1.5 z-[3]">
            <FindersBadge count={animal.finders ?? 0} />
          </div>
          <div className="absolute top-1 right-1">
            <RarityBadge rarity={animal.rarity} />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8">
            <p className="text-xs font-display font-bold text-white truncate leading-tight">
              {animal.name}
            </p>
            {animal.scientific_name && (
              <p className="text-[9px] font-body italic text-white/80 truncate">
                {animal.scientific_name}
              </p>
            )}
          </div>
        </>
) : (
        <div className="species-tile-locked absolute inset-0 flex flex-col">
          <div className="absolute top-1.5 left-1.5 z-[3]">
            <FindersBadge count={animal.finders ?? 0} />
          </div>

          <div className="flex-1 flex items-center justify-center pt-6">
            <span className="species-tile-locked__disc flex items-center justify-center rounded-full">
              <SpeciesCategoryIcon category={animal.category} className="w-7 h-7 text-muted-foreground/70" />
            </span>
          </div>

          <div className="species-tile-locked__label px-2 pb-2 pt-1.5 text-center">
            <p className="text-[11px] font-display font-semibold text-foreground/80 truncate leading-tight">
              {animal.name}
            </p>
            {animal.scientific_name && (
              <p className="text-[9px] font-body italic text-muted-foreground/70 truncate">
                {animal.scientific_name}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  ),
);
BrowseSpeciesCard.displayName = 'BrowseSpeciesCard';


const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBreedGroup, setSelectedBreedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'mine' | 'categories' | 'collections'>('mine');
  const [rarityFilter, setRarityFilter] = useState<Rarity[]>([]);
const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [selectedFinders, setSelectedFinders] = useState<number | undefined>(undefined);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedCollectionKey, setSelectedCollectionKey] = useState<string | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'hub' | 'explore' | 'species' | 'upsell'>('hub');
  const [pickerTab, setPickerTab] = useState<'department' | 'city'>('department');
  const [deptSearch, setDeptSearch] = useState('');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [mineSearch, setMineSearch] = useState('');
const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [popularityFilter, setPopularityFilter] = useState<PopularityTier[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mineSort, setMineSort] = useState<MineSort>('recent');
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [myLevel, setMyLevel] = useState<number | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase.from('profiles').select('level').eq('user_id', userId).single()
      .then(({ data }) => setMyLevel(data?.level ?? null));
  }, [session?.user?.id]);


  // Scroll to top when entering a category, zone or collection detail view
  useEffect(() => {
    if (selectedCategory || selectedZoneId || selectedCollectionKey) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [selectedCategory, selectedZoneId, selectedCollectionKey]);

  const {
    animals,
    myCaptures,
    setMyCaptures,
    loading,
    unreadCount,
    subscribedZones,
    setSubscribedZones,
    animalsByDept,
    loadDeptAnimals,
  } = useBestiaryData(session?.user?.id);

  const uid = session?.user?.id;

  // Restaure le tri + l'ordre personnalisé de « Mes captures »
  useEffect(() => {
    if (!uid) return;
    try {
      const savedSort = localStorage.getItem(sortStorageKey(uid));
      if (savedSort === 'recent' || savedSort === 'alpha' || savedSort === 'rarity' || savedSort === 'custom') {
        setMineSort(savedSort);
      }
      const savedOrder = localStorage.getItem(orderStorageKey(uid));
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed)) setCustomOrder(parsed.filter((v): v is string => typeof v === 'string'));
      }
    } catch {
      /* stockage indisponible */
    }
  }, [uid]);

  const applySort = useCallback(
    (mode: MineSort) => {
      setMineSort(mode);
      setSortOpen(false);
      if (uid) {
        try {
          localStorage.setItem(sortStorageKey(uid), mode);
        } catch {
          /* stockage indisponible */
        }
      }
    },
    [uid],
  );

  const handleReorder = useCallback(
    (orderedIds: string[]) => {
      setCustomOrder(orderedIds);
      setMineSort('custom');
      if (uid) {
        try {
          localStorage.setItem(orderStorageKey(uid), JSON.stringify(orderedIds));
          localStorage.setItem(sortStorageKey(uid), 'custom');
        } catch {
          /* stockage indisponible */
        }
      }
    },
    [uid],
  );


  const { citySearch, setCitySearch, cityResults, setCityResults, cityLoading } =
    useCitySearch(pickerTab === 'city');

  const resolveShelveSlot = useCallback((animalName: string) => {
    const key = animalName.toLowerCase();
    return document.querySelector<HTMLElement>(
      `[data-shelve-slot="${key.replace(/["\\]/g, '\\$&')}"]`,
    );
  }, []);

  const { pendingShelve, flyingCardStyle, isFlashing } = useShelveAnimation({
    loading,
    resolveSlot: resolveShelveSlot,
    onPrepare: useCallback(() => {
      // Retour sur la vue « toutes les espèces », sans filtre, pour y voir la carte
      setSelectedCategory(null);
      setSelectedCollectionKey(null);
      setSelectedZoneId(null);
      setSelectedBreedGroup(null);
      setCategoryFilter([]);
      setRarityFilter([]);
      setPopularityFilter([]);
      setSpeciesQuery('');
    }, []),
  });


  const handleZoneReady = useCallback(
    (zoneId: string, source: 'department' | 'city' | 'detect') => {
      setShowDeptPicker(false);
      if (source === 'department') setDeptSearch('');
      if (source === 'city') {
        setCitySearch('');
        setCityResults([]);
      }
      if (source === 'detect') setPickerMode('hub');
      setSelectedZoneId(zoneId);
    },
    [setCitySearch, setCityResults]
  );

  const { isPremium } = useSubscription(session?.user?.id);
  const { collectionKeys, addCollection, removeCollection } = useSpeciesCollections(session?.user?.id);

  const slotsUsed = subscribedZones.length + collectionKeys.length;

  const guardSlot = useCallback(() => {
    if (isPremium) return true;
    if (subscribedZones.length + collectionKeys.length < FREE_SLOT_LIMIT) return true;
    toast.error(`Limite de ${FREE_SLOT_LIMIT} zones ou collections atteinte`, {
      description: 'Passe en Premium pour en suivre autant que tu veux.',
      action: { label: 'Premium', onClick: () => navigate('/premium') },
    });
    return false;
  }, [isPremium, subscribedZones.length, collectionKeys.length, navigate]);

  const handleAddCollectionClick = useCallback(() => {
    if (!isPremium && slotsUsed >= FREE_SLOT_LIMIT) {
      setPickerMode('upsell');
      setShowDeptPicker(true);
      return;
    }
    setPickerMode('species');
    setCollectionSearch('');
    setShowDeptPicker(true);
  }, [isPremium, slotsUsed]);

  const openAddSlotModal = useCallback(() => {
    if (!isPremium && slotsUsed >= FREE_SLOT_LIMIT) {
      setPickerMode('upsell');
    } else {
      setPickerMode('hub');
    }
    setShowDeptPicker(true);
  }, [isPremium, slotsUsed]);

  const {
    loadingDept,
    addDepartment: handleAddDept,
    addCity: handleAddCity,
    removeZone,
  } = useZoneSubscriptions({
    userId: session?.user?.id,
    animals,
    subscribedZones,
    setSubscribedZones,
    loadDeptAnimals,
    onZoneReady: handleZoneReady,
    canAddZone: guardSlot,
  });

  const handleRemoveZone = async (zoneId: string) => {
    await removeZone(zoneId);
    setSelectedZoneId(null);
  };

  /** Grandes catégories proposées comme collections (clé préfixée "cat:"). */
  const categoryCollections = useMemo(() => {
    const counts = new Map<string, { total: number; captured: number }>();
    animals.forEach((a) => {
      const norm = normalizeCategory(a.category);
      const entry = counts.get(norm) || { total: 0, captured: 0 };
      entry.total++;
      if (a.captured) entry.captured++;
      counts.set(norm, entry);
    });
    return Array.from(counts.entries())
      .map(([name, data]) => ({
        group: { key: `cat:${name}`, label: name, emoji: getCategoryEmoji(name) } as BreedGroup,
        ...data,
      }))
      .sort((a, b) => a.group.label.localeCompare(b.group.label, 'fr'));
  }, [animals]);

  /** Every species group that actually has species in the bestiary, with progress. */
  const availableCollections = useMemo(() => {
    const counts = new Map<string, { total: number; captured: number }>();
    animals.forEach((a) => {
      const group = getSpeciesGroup(a.name, a.scientific_name, a.category);
      if (!group) return;
      const entry = counts.get(group.key) || { total: 0, captured: 0 };
      entry.total++;
      if (a.captured) entry.captured++;
      counts.set(group.key, entry);
    });
    const groups = BREED_GROUPS.map((group) => ({ group, ...(counts.get(group.key) || { total: 0, captured: 0 }) }))
      .filter((e) => e.total >= MIN_BREEDS_PER_GROUP)
      .sort((a, b) => a.group.label.localeCompare(b.group.label, 'fr'));
    return [...categoryCollections, ...groups];
  }, [animals, categoryCollections]);

  const myCollections = useMemo(
    () => availableCollections.filter((e) => collectionKeys.includes(e.group.key)),
    [availableCollections, collectionKeys],
  );

  const selectedCollection = useMemo(
    () => availableCollections.find((e) => e.group.key === selectedCollectionKey) || null,
    [availableCollections, selectedCollectionKey],
  );

  const collectionAnimals = useMemo(() => {
    if (!selectedCollection) return [];
    const key = selectedCollection.group.key;
    const list = key.startsWith('cat:')
      ? animals.filter((a) => normalizeCategory(a.category) === selectedCollection.group.label)
      : animals.filter(
          (a) => getSpeciesGroup(a.name, a.scientific_name, a.category)?.key === key,
        );
    return list; // déjà trié alphabétiquement via `animals`
  }, [animals, selectedCollection]);

  /** Catégorie utilisée pour le classement affiché dans une collection. */
  const collectionLeaderboardCategory = useMemo(() => {
    if (!selectedCollection) return null;
    if (selectedCollection.group.key.startsWith('cat:')) return selectedCollection.group.label;
    const counts = new Map<string, number>();
    collectionAnimals.forEach((a) => {
      const norm = normalizeCategory(a.category);
      counts.set(norm, (counts.get(norm) || 0) + 1);
    });
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : 'all';
  }, [selectedCollection, collectionAnimals]);




  // Categories with counts
  const categoryData = useMemo(() => {
    const map = new Map<string, { total: number; captured: number }>();
    animals.forEach(a => {
      const norm = normalizeCategory(a.category);
      const entry = map.get(norm) || { total: 0, captured: 0 };
      entry.total++;
      if (a.captured) entry.captured++;
      map.set(norm, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([name, data]) => ({ name, ...data }));
  }, [animals]);

  // Normalized search query (accents & case insensitive)
  const normalizeSearch = (v: string) =>
    v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const speciesQuery = normalizeSearch(speciesSearch);

  const matchesSearch = useCallback(
    (a: { name: string; scientific_name?: string | null; category?: string | null }) => {
      if (!speciesQuery) return true;
      return (
        normalizeSearch(a.name).includes(speciesQuery) ||
        normalizeSearch(a.scientific_name || '').includes(speciesQuery) ||
        normalizeSearch(a.category || '').includes(speciesQuery)
      );
    },
    [speciesQuery]
  );

// Filtre de popularité communautaire (vide = toutes les popularités)
  const matchesPopularity = useCallback(
    (n: number) => popularityFilter.length === 0 || popularityFilter.includes(popularityTierOf(n)),
    [popularityFilter],
  );

  // Animals for selected category (with rarity filter + search)
  const categoryAnimals = useMemo(() => {
    if (!selectedCategory) return [];
    return animals
      .filter(a => selectedCategory === ALL_SPECIES || normalizeCategory(a.category) === selectedCategory)
      .filter(a => rarityFilter.length === 0 || rarityFilter.includes(normalizeRarity(a.rarity)))
      .filter(a => matchesPopularity(a.finders ?? 0))
      .filter(matchesSearch);
  }, [animals, selectedCategory, rarityFilter, matchesPopularity, matchesSearch]);

  // Sub-level inside a category: breed groups (races de chien…) + type groups (papillons, rapaces…)
  const breedGroupsInCategory = useMemo(() => {
    const map = new Map<string, { group: BreedGroup; total: number; captured: number }>();
    categoryAnimals.forEach(a => {
      const group = getSpeciesGroup(a.name, a.scientific_name, a.category);
      if (!group) return;
      const entry = map.get(group.key) || { group, total: 0, captured: 0 };
      entry.total++;
      if (a.captured) entry.captured++;
      map.set(group.key, entry);
    });
    return Array.from(map.values())
      .filter(e => e.total >= MIN_BREEDS_PER_GROUP)
      .sort((a, b) => b.total - a.total);
  }, [categoryAnimals]);

  const activeBreedGroup = useMemo(
    () => breedGroupsInCategory.find(e => e.group.key === selectedBreedGroup) || null,
    [breedGroupsInCategory, selectedBreedGroup],
  );

  /** Cards shown in the binder grid: members of the open group, or all species minus breeds. */
  const gridAnimals = useMemo(() => {
    if (activeBreedGroup) {
      return categoryAnimals.filter(
        a => getSpeciesGroup(a.name, a.scientific_name, a.category)?.key === activeBreedGroup.group.key,
      );
    }
    // Only domestic breed groups are hidden from the full grid (they are too numerous).
    const pendingName = pendingShelve?.animalName.toLocaleLowerCase('fr');
    const hiddenKeys = new Set(breedGroupsInCategory.filter(e => e.group.breeds).map(e => e.group.key));
    const filtered = categoryAnimals.filter(a => {
      if (pendingName && a.name.toLocaleLowerCase('fr') === pendingName) return true;
      const group = getBreedGroup(a.scientific_name);
      return !group || !hiddenKeys.has(group.key);
    });
    // « Toutes les espèces » peut contenir des milliers de cartes : on plafonne l'affichage.
    if (selectedCategory === ALL_SPECIES && !speciesQuery) {
      const capped = filtered.slice(0, ALL_GRID_LIMIT);
      if (pendingName && !capped.some(a => a.name.toLocaleLowerCase('fr') === pendingName)) {
        const target = filtered.find(a => a.name.toLocaleLowerCase('fr') === pendingName);
        if (target) capped.unshift(target);
      }
      return capped;
    }
    return filtered;

  }, [categoryAnimals, breedGroupsInCategory, activeBreedGroup, selectedCategory, speciesQuery, pendingShelve]);



// Browse view: all species, filtered by category chips + rarity + popularity + search
  const browseAnimals = useMemo(() => {
    return animals
      .filter(a => categoryFilter.length === 0 || categoryFilter.includes(normalizeCategory(a.category)))
      .filter(a => rarityFilter.length === 0 || rarityFilter.includes(normalizeRarity(a.rarity)))
      .filter(a => matchesPopularity(a.finders ?? 0))
      .filter(matchesSearch);
    // Pas de re-tri : `animals` est déjà trié alphabétiquement au chargement.
  }, [animals, categoryFilter, rarityFilter, matchesPopularity, matchesSearch]);

  /** Index de la carte à rejoindre pour l'animation de rangement. */
  const shelveTargetIndex = useMemo(() => {
    if (!pendingShelve) return null;
    const target = pendingShelve.animalName.toLocaleLowerCase('fr');
    const idx = browseAnimals.findIndex(a => a.name.toLocaleLowerCase('fr') === target);
    return idx >= 0 ? idx : null;
  }, [pendingShelve, browseAnimals]);

  // Virtualisation : seules les lignes visibles sont montées (mémoire constante).


// Callback stable pour les cartes mémoïsées de la grille.
  const handleSelectBrowseAnimal = useCallback((animal: BestiaryAnimal) => {
    if (animal.captured && animal.captureData) {
      setSelectedFinders(undefined);
      setSelectedCard(animal.captureData);
    } else {
      setSelectedFinders(animal.finders ?? 0);
      setSelectedCard({
        id: `uncaptured-${animal.name}`,
        name: animal.name,
        scientificName: animal.scientific_name || '',
        image: '',
        rarity: animal.rarity as Rarity,
        category: animal.category,
        description: '',
        habitat: '',
        diet: '',
        conservation: '',
        funFact: '',
        discoveredAt: '',
        location: '',
      });
    }
  }, []);

const activeFilterCount = categoryFilter.length + rarityFilter.length + popularityFilter.length;

  const browseTotal = useMemo(
    () => animals
      .filter(a => categoryFilter.length === 0 || categoryFilter.includes(normalizeCategory(a.category)))
      .filter(a => rarityFilter.length === 0 || rarityFilter.includes(normalizeRarity(a.rarity)))
      .filter(a => matchesPopularity(a.finders ?? 0))
      .filter(matchesSearch).length,
    [animals, categoryFilter, rarityFilter, matchesPopularity, matchesSearch],
  );

  // Flat list of my own captures (one entry per capture), filtered + trié selon le mode choisi
  const myCapturedAnimals = useMemo(() => {
    const q = normalizeSearch(mineSearch);
    const list = myCaptures
      .filter(c => rarityFilter.length === 0 || rarityFilter.includes(normalizeRarity(c.rarity)))
      .filter(c =>
        !q ||
        normalizeSearch(c.name).includes(q) ||
        normalizeSearch(c.scientificName || '').includes(q) ||
        normalizeSearch(c.category || '').includes(q) ||
        normalizeSearch(c.location || '').includes(q)
      );

    if (mineSort === 'alpha') {
      return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    if (mineSort === 'rarity') {
      return list.sort((a, b) => {
        const diff = (RARITY_SORT_ORDER[normalizeRarity(b.rarity)] ?? 99) - (RARITY_SORT_ORDER[normalizeRarity(a.rarity)] ?? 99);
        if (diff !== 0) return diff;
        return +new Date(b.discoveredAt || 0) - +new Date(a.discoveredAt || 0);
      });
    }
    if (mineSort === 'custom' && customOrder.length > 0) {
      const rank = new Map(customOrder.map((id, i) => [id, i]));
      return list.sort((a, b) => {
        const ra = rank.get(a.id);
        const rb = rank.get(b.id);
        if (ra === undefined && rb === undefined) {
          return +new Date(b.discoveredAt || 0) - +new Date(a.discoveredAt || 0);
        }
        if (ra === undefined) return -1; // nouvelles captures en tête
        if (rb === undefined) return 1;
        return ra - rb;
      });
    }
    return list.sort((a, b) => +new Date(b.discoveredAt || 0) - +new Date(a.discoveredAt || 0));
  }, [myCaptures, rarityFilter, mineSearch, mineSort, customOrder]);



  const selectedZone: ZoneSub | null = useMemo(
    () => subscribedZones.find((z) => z.id === selectedZoneId) || null,
    [subscribedZones, selectedZoneId],
  );

  // Animals for selected zone (department or city — both use parent department fauna)
  const zoneAnimals = useMemo(() => {
    if (!selectedZone) return [];
    const deptSet = animalsByDept[selectedZone.departmentCode];
    if (!deptSet) return [];
    const set = selectedZone.kind === 'city' ? buildCityAnimalSet(deptSet, animals) : deptSet;
    return animals.filter((a) => set.has(a.name.toLowerCase())); // déjà trié via `animals`
  }, [animals, animalsByDept, selectedZone]);

  // Progress map keyed by zone id
  const zoneProgress = useMemo(() => {
    const map: Record<string, { total: number; captured: number }> = {};
    subscribedZones.forEach((z) => {
      const deptSet = animalsByDept[z.departmentCode];
      if (!deptSet) { map[z.id] = { total: 0, captured: 0 }; return; }
      const set = z.kind === 'city' ? buildCityAnimalSet(deptSet, animals) : deptSet;
      let total = 0, captured = 0;
      animals.forEach((a) => {
        if (set.has(a.name.toLowerCase())) {
          total++;
          if (a.captured) captured++;
        }
      });
      map[z.id] = { total, captured };
    });
    return map;
  }, [animals, animalsByDept, subscribedZones]);

  const filteredDeptOptions = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    return DEPARTEMENTS.filter((d) =>
      !q || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.region.toLowerCase().includes(q)
    );
  }, [deptSearch]);

  const filteredCollectionOptions = useMemo(() => {
    const q = normalizeSearch(collectionSearch);
    return availableCollections.filter((e) => !q || normalizeSearch(e.group.label).includes(q));
  }, [availableCollections, collectionSearch]);


  // Single source of truth for "how many captures": the raw approved captures list.

  // Zone picker sheet — hub with presets + explore mode
  const deptPickerSheet = (
    <Sheet
      open={showDeptPicker}
      onOpenChange={(o) => {
        setShowDeptPicker(o);
        if (!o) setPickerMode('hub');
      }}
    >
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {pickerMode !== 'hub' && (
              <button
                onClick={() => setPickerMode('hub')}
                className="p-1 -ml-1 rounded-full hover:bg-muted transition"
                aria-label="Retour"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <SheetTitle className="font-display">
              {pickerMode === 'hub'
                ? 'Ajouter à ma collection'
                : pickerMode === 'species'
                ? "Collections d'espèces"
                : pickerMode === 'upsell'
                ? 'Collections illimitées'
                : 'Explorer une zone'}
            </SheetTitle>
          </div>
        </SheetHeader>

        {pickerMode === 'hub' && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            <p className="text-xs text-muted-foreground font-display leading-relaxed">
              Ajoute une zone à suivre, ou une collection d'espèces à compléter (races de chien, papillons, rapaces…).
            </p>


            <button
              onClick={() => { setPickerMode('explore'); setPickerTab('city'); }}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition active:scale-[0.98] hover:border-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Compass className="w-6 h-6 text-foreground" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-foreground">Ajouter une zone</h3>
                  <p className="text-[11px] text-muted-foreground font-display leading-relaxed mt-0.5">
                    Prépare un voyage, une rando ou une visite : ajoute n'importe quelle ville ou département.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleAddCollectionClick}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition active:scale-[0.98] hover:border-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6 text-foreground" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-foreground">Ajouter une collection</h3>
                  <p className="text-[11px] text-muted-foreground font-display leading-relaxed mt-0.5">
                    Races de chien, races de chat, papillons, rapaces, serpents… choisis ce que tu veux compléter.
                  </p>
                </div>
              </div>
            </button>

            {isPremium ? (
              <p className="text-[10px] text-muted-foreground font-display text-center pt-2">
                Premium : tu peux suivre autant de zones et de collections que tu veux.
              </p>
            ) : (
              <button
                onClick={() => navigate('/premium')}
                className="w-full pt-2 text-center"
              >
                <p className="text-[10px] text-muted-foreground font-display">
                  {slotsUsed}/{FREE_SLOT_LIMIT} zones ou collections utilisées ·{' '}
                  <span className="text-primary font-semibold">Passe en Premium pour des zones et collections illimitées</span>
                </p>
              </button>
            )}

          </div>
        )}

        {pickerMode === 'upsell' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Crown className="w-11 h-11 text-primary" strokeWidth={1.75} />
              </div>
            </div>

            <h3 className="font-display font-bold text-xl text-foreground mb-2">
              Débloque toutes les collections
            </h3>
            <p className="text-sm text-muted-foreground font-display leading-relaxed max-w-xs mb-6">
              Avec <span className="text-foreground font-semibold">Faunex Premium</span>, crée autant de séries thématiques que tu veux : races de chien, races de chat, papillons, rapaces, serpents… et suis toutes les zones que tu veux.
            </p>

            <div className="w-full max-w-xs space-y-2.5 mb-8 text-left">
              {[
                'Collections illimitées',
                'Zones et territoires illimités',
                'Classements détaillés par catégorie',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5 text-sm font-display text-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Plus className="w-3 h-3 text-primary" strokeWidth={2.5} />
                  </div>
                  {benefit}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowDeptPicker(false);
                setPickerMode('hub');
                navigate('/premium');
              }}
              className="w-full max-w-xs rounded-2xl bg-primary text-primary-foreground py-3.5 font-display font-semibold text-sm active:scale-[0.98] transition shadow-lg shadow-primary/20"
            >
              Passer à Premium
            </button>
            <button
              onClick={() => {
                setShowDeptPicker(false);
                setPickerMode('hub');
              }}
              className="mt-3 text-xs font-display text-muted-foreground underline"
            >
              Plus tard
            </button>
          </div>
        )}

        {pickerMode === 'species' && (
          <>
            {!isPremium && slotsUsed >= FREE_SLOT_LIMIT ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-primary" strokeWidth={2} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-lg text-foreground">Limite atteinte</h3>
                  <p className="text-sm text-muted-foreground font-display leading-relaxed">
                    Tu peux suivre jusqu’à <strong className="text-foreground">{FREE_SLOT_LIMIT}</strong> zones ou collections avec un compte gratuit.
                    Passe à Premium pour ajouter autant de collections que tu veux.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeptPicker(false);
                    navigate('/premium');
                  }}
                  className="w-full max-w-xs rounded-2xl bg-primary text-primary-foreground py-3.5 font-display font-semibold text-sm active:scale-[0.98] transition"
                >
                  Passer à Premium
                </button>
                <button
                  onClick={() => setShowDeptPicker(false)}
                  className="text-xs font-display text-muted-foreground underline"
                >
                  Plus tard
                </button>
              </div>
            ) : (
              <>
                <div className="px-5 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      placeholder="Rechercher une collection…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm font-display placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {filteredCollectionOptions.length === 0 ? (
                    <p className="text-center text-xs font-display text-muted-foreground py-8">Aucune collection trouvée.</p>
                  ) : (
                    filteredCollectionOptions.map(({ group, total, captured }) => {
                      const already = collectionKeys.includes(group.key);
                      return (
                        <button
                          key={group.key}
                          disabled={already}
                          onClick={
                            already
                              ? undefined
                              : () => {
                                  if (!guardSlot()) return;
                                  addCollection(group.key);
                                  setShowDeptPicker(false);
                                  setPickerMode('hub');
                                  setViewMode('collections');
                                }
                          }
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${
                            already
                              ? 'bg-muted/40 text-muted-foreground cursor-not-allowed'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <span className={`text-xl shrink-0 ${already ? 'opacity-50' : ''}`}>{group.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-display font-semibold truncate ${already ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {group.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-display">
                              {group.key.startsWith('cat:') ? 'Grande catégorie · ' : ''}{captured}/{total} capturés

                            </p>
                          </div>
                          {already ? (
                            <span className="text-[10px] font-display text-muted-foreground">Ajoutée</span>
                          ) : (
                            <Plus className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </>
        )}


        {pickerMode === 'explore' && (
          <>
            <div className="px-5 pt-3 flex gap-2">
              <button
                onClick={() => setPickerTab('department')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-display font-semibold transition ${
                  pickerTab === 'department' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" strokeWidth={2} />
                Département
              </button>
              <button
                onClick={() => setPickerTab('city')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-display font-semibold transition ${
                  pickerTab === 'city' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" strokeWidth={2} />
                Ville
              </button>
            </div>
            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  key={pickerTab}
                  autoFocus
                  type="text"
                  value={pickerTab === 'department' ? deptSearch : citySearch}
                  onChange={(e) => pickerTab === 'department' ? setDeptSearch(e.target.value) : setCitySearch(e.target.value)}
                  placeholder={pickerTab === 'department' ? 'Rechercher (nom, n° ou région)' : 'Rechercher une ville…'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted border-0 text-sm font-display focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {pickerTab === 'department' && filteredDeptOptions.map((d) => {
                const already = subscribedZones.some((z) => z.kind === 'department' && z.departmentCode === d.code);
                return (
                  <button
                    key={d.code}
                    disabled={loadingDept}
                    onClick={() => handleAddDept(d.code)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition text-left disabled:opacity-50"
                  >
                    <span className="w-10 text-xs font-display font-bold text-muted-foreground tabular-nums">{d.code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold text-foreground truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground font-display truncate">{d.region}</p>
                    </div>
                    {already ? (
                      <span className="text-[10px] font-display text-primary">Déjà ajouté</span>
                    ) : (
                      <Plus className="w-4 h-4 text-primary" />
                    )}
                  </button>
                );
              })}
              {pickerTab === 'city' && (
                <>
                  {citySearch.trim().length < 2 && (
                    <p className="text-center text-xs text-muted-foreground font-display py-8 px-4">
                      Tape au moins 2 lettres pour rechercher une commune française.
                    </p>
                  )}
                  {cityLoading && (
                    <p className="text-center text-xs text-muted-foreground font-display py-4">Recherche…</p>
                  )}
                  {!cityLoading && citySearch.trim().length >= 2 && cityResults.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground font-display py-8">Aucune commune trouvée</p>
                  )}
                  {cityResults.map((c) => {
                    const postcode = c.codesPostaux?.[0] || '';
                    const already = subscribedZones.some(
                      (z) => z.kind === 'city' && z.cityName === c.nom && z.cityPostcode === postcode,
                    );
                    return (
                      <button
                        key={c.code}
                        disabled={loadingDept}
                        onClick={() => handleAddCity(c)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition text-left disabled:opacity-50"
                      >
                        <Building2 className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-semibold text-foreground truncate">{c.nom}</p>
                          <p className="text-[11px] text-muted-foreground font-display truncate">
                            {postcode} · {c.codeDepartement}
                          </p>
                        </div>
                        {already ? (
                          <span className="text-[10px] font-display text-primary">Déjà ajouté</span>
                        ) : (
                          <Plus className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );

  if (loading) return <LoadingScreen />;

  // Zone detail view
  if (selectedZone) {
    const dept = getDepartement(selectedZone.departmentCode);
    const prog = zoneProgress[selectedZone.id] || { total: 0, captured: 0 };
    const isCity = selectedZone.kind === 'city';
    const title = isCity ? (selectedZone.cityName || 'Ville') : (dept ? `${dept.name} (${dept.code})` : selectedZone.departmentCode);
    const subtitle = isCity
      ? `${selectedZone.cityPostcode || ''}${dept ? ` · ${dept.name}` : ''} · ${prog.captured}/${prog.total} capturés`
      : `${prog.captured}/${prog.total} capturés`;
    
    return (
      <main className="min-h-screen bg-background pb-24">
        
        <CollectionHero
          image={getZoneArt(selectedZone.kind).image}
          overlay={getZoneArt(selectedZone.kind).overlay}
          title={title}
          subtitle={isCity ? `${selectedZone.cityPostcode || ''}${dept ? ` · ${dept.name}` : ''}` : undefined}
          captured={prog.captured}
          total={prog.total}
          
          onBack={() => setSelectedZoneId(null)}
          onRemove={() => handleRemoveZone(selectedZone.id)}
          removeLabel="Supprimer la rubrique"
        />

        <div className="relative z-10 max-w-lg mx-auto px-3 pt-3 space-y-4">
<CategoryLeaderboard territory={{ code: selectedZone.departmentCode, label: title }} />

          {zoneAnimals.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-muted-foreground font-display text-sm">
                Aucune espèce répertoriée pour cette zone pour le moment.
              </p>
            </div>
          ) : (
<div className="grid grid-cols-3 gap-2">
              {zoneAnimals.map((animal) => (
                <BrowseSpeciesCard key={animal.name} animal={animal} onSelect={handleSelectBrowseAnimal} />
              ))}
            </div>
          )}
        </div>

        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} communityFinders={selectedFinders} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />
        {deptPickerSheet}
      </main>
    );
  }

  // Species collection detail view (races de chien, papillons…)
  if (selectedCollection) {
    return (
      <main className="min-h-screen bg-background pb-24">
        
        <CollectionHero
          image={getCollectionArt(selectedCollection.group.key, selectedCollection.group.label).image}
          overlay={getCollectionArt(selectedCollection.group.key, selectedCollection.group.label).overlay}
          title={selectedCollection.group.label}
          captured={selectedCollection.captured}
          total={selectedCollection.total}
          onBack={() => setSelectedCollectionKey(null)}
          onRemove={() => { removeCollection(selectedCollection.group.key); setSelectedCollectionKey(null); }}
          removeLabel="Retirer la collection"
        />

        <div className="relative z-10 max-w-lg mx-auto px-3 pt-3 space-y-4">

          {collectionLeaderboardCategory && (
            <CategoryLeaderboard category={collectionLeaderboardCategory} />
          )}

<div className="grid grid-cols-3 gap-2">
            {collectionAnimals.map((animal) => (
              <BrowseSpeciesCard key={animal.name} animal={animal} onSelect={handleSelectBrowseAnimal} />
            ))}
</div>
        </div>

        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} communityFinders={selectedFinders} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />
        {deptPickerSheet}
      </main>
    );
  }

  // Category grid view
  if (!selectedCategory) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-display font-bold text-primary">mon faunex</h1>
              <div className="flex items-center gap-2">
{myLevel != null && (
                  <LevelBadge level={myLevel} />
                )}
                

                <button
                  onClick={() => navigate('/notifications')}
                  className="relative p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <Bell className="w-5 h-5 text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </PageHeader>

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">


          {/* View toggle + rarity filter */}
          <section className="space-y-3">
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border w-full">
              <button
                onClick={() => setViewMode('mine')}
                className={`flex-1 text-xs font-display font-semibold py-2 rounded-full transition-all ${
                  viewMode === 'mine'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Mes captures
              </button>
              <button
                onClick={() => setViewMode('categories')}
                className={`flex-1 text-xs font-display font-semibold py-2 rounded-full transition-all ${
                  viewMode === 'categories'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
Bestiaire
              </button>
              <button
                onClick={() => setViewMode('collections')}
                className={`flex-1 text-xs font-display font-semibold py-2 rounded-full transition-all ${
                  viewMode === 'collections'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Collections
              </button>
            </div>
</section>

          {viewMode === 'mine' && (
            <section>
              {/* Recherche + bouton tri */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={mineSearch}
                    onChange={(e) => setMineSearch(e.target.value)}
                    placeholder="Rechercher dans mes captures…"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card border border-border text-sm font-display placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  {mineSearch && (
                    <button
                      onClick={() => setMineSearch('')}
                      aria-label="Effacer la recherche"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSortOpen(true)}
                  className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-display font-semibold transition-all active:scale-[0.97] ${
                    mineSort !== 'recent'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/40'
                  }`}
                >
                  <ArrowDownUp className="w-4 h-4" />
                  Tri
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">Mes captures</h2>
                <span className="text-[11px] font-display text-muted-foreground tabular-nums">
                  {myCapturedAnimals.length} capture{myCapturedAnimals.length > 1 ? 's' : ''}
                </span>
              </div>

              {myCapturedAnimals.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-xs font-display text-muted-foreground px-6">
                    {mineSearch.trim()
                      ? `Aucune capture ne correspond à « ${mineSearch.trim()} ».`
: rarityFilter.length === 0
                      ? "Tu n'as pas encore de capture. Pars en exploration !"
                      : "Aucune capture ne correspond aux raretés sélectionnées."}

                  </p>
                </div>
              ) : (
                <MyCapturesGrid
                  items={myCapturedAnimals}
                  onSelect={setSelectedCard}
                  onReorder={handleReorder}
                />
              )}


              {/* Modale de tri */}
              <Sheet open={sortOpen} onOpenChange={setSortOpen}>
                <SheetContent side="bottom" className="rounded-t-3xl">
                  <SheetHeader>
                    <SheetTitle className="font-display">Trier mes captures</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-2 pb-4">
                    {(['recent', 'alpha', 'rarity', 'custom'] as MineSort[]).map((mode) => {
                      const active = mineSort === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => applySort(mode)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-display font-semibold transition active:scale-[0.98] ${
                            active
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-card border-border text-foreground'
                          }`}
                        >
                          <span>{MINE_SORT_LABELS[mode]}</span>
                          {active && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                    <p className="pt-1 text-[11px] font-display text-muted-foreground">
                      Le tri personnalisé s'active automatiquement dès que tu déplaces une carte.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </section>
          )}


          {viewMode === 'categories' && (
            <section>
              {/* Recherche + bouton filtres */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={speciesSearch}
                    onChange={(e) => setSpeciesSearch(e.target.value)}
                    placeholder="Rechercher une espèce…"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card border border-border text-sm font-display placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  {speciesSearch && (
                    <button
                      onClick={() => setSpeciesSearch('')}
                      aria-label="Effacer la recherche"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
<button
                  onClick={() => setFilterOpen(true)}
                  className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-display font-semibold transition-all active:scale-[0.97] ${
                    activeFilterCount > 0
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/40'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtres
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber text-amber-dark text-[10px] font-bold flex items-center justify-center shadow-sm">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

{/* Chips des filtres actifs */}
              {(categoryFilter.length > 0 || popularityFilter.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {categoryFilter.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(prev => prev.filter(c => c !== cat))}
                      className="flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-display font-semibold active:scale-95 transition"
                    >
<SpeciesCategoryIcon category={cat} className="w-3.5 h-3.5" />
                      {cat}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
{popularityFilter.map(tier => {
                    const { Icon } = POPULARITY_LABELS[tier];
                    return (
                    <button
                      key={tier}
                      onClick={() => setPopularityFilter(prev => prev.filter(t => t !== tier))}
                      className={`popularity-chip popularity-chip--${tier} text-[11px] font-display font-semibold active:scale-95 transition`}
                    >
                      <Icon className="w-3 h-3" />
                      {POPULARITY_LABELS[tier].label}
                      <X className="w-3 h-3" />
                    </button>
                    );
                  })}
                  <button
                    onClick={() => { setCategoryFilter([]); setPopularityFilter([]); }}
                    className="px-2 py-1 rounded-full text-[11px] font-display font-semibold text-muted-foreground hover:text-foreground transition"
                  >
                    Tout effacer
                  </button>
                </div>
              )}

              {/* Classement général de la semaine */}
              <CategoryLeaderboard category="all" />

              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">
                  {speciesQuery ? 'Résultats' : ALL_SPECIES}
                </h2>
                <span className="text-[11px] font-display text-muted-foreground tabular-nums">
                  {myCaptures.length} / {browseTotal} espèces
                </span>
              </div>

              {browseAnimals.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-xs font-display text-muted-foreground px-6">
                    Aucune espèce ne correspond à ta recherche ou à tes filtres.
                  </p>
                </div>
              ) : (
                <VirtualSpeciesGrid
                  items={browseAnimals}
                  columns={3}
                  gap={8}
                  aspectRatio={3 / 4}
                  getKey={(animal) => animal.name}
                  scrollToIndex={shelveTargetIndex}
                  renderItem={(animal) => (
                    <div
                      data-shelve-slot={animal.name.toLowerCase()}
                      className={isFlashing(animal.name) ? 'shelve-slot-flash rounded-xl' : undefined}
                    >
                      <BrowseSpeciesCard animal={animal} onSelect={handleSelectBrowseAnimal} />
                    </div>
                  )}
                />
              )}


              {/* Modale de filtres */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl px-5 pb-8">
                  <SheetHeader className="text-left">
                    <SheetTitle className="font-display text-base flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      Filtres
                    </SheetTitle>
                  </SheetHeader>

                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-3 mb-2">Catégories</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryData.map(cat => {
                      const active = categoryFilter.includes(cat.name);
                      return (
                        <button
                          key={cat.name}
                          onClick={() =>
                            setCategoryFilter(prev =>
                              active ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
                            )
                          }
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-semibold border transition-all active:scale-95 ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-foreground border-border hover:border-primary/40'
                          }`}
                        >
<SpeciesCategoryIcon category={cat.name} className="w-4 h-4" />
                          {cat.name}
                          <span className={active ? 'opacity-80' : 'opacity-50'}>{cat.total}</span>
                        </button>
                      );
                    })}
                  </div>

<p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-5 mb-2">Rareté</p>
                  <div className="flex flex-wrap gap-2">
                    {RARITY_ORDER.map((r) => {
                      const active = rarityFilter.includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() =>
                            setRarityFilter(prev =>
                              active ? prev.filter(x => x !== r) : [...prev, r]
                            )
                          }
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-semibold border transition-all active:scale-95 ${
                            active
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

<p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-5 mb-2">Popularité</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(POPULARITY_LABELS) as PopularityTier[]).map((t) => {
                      const active = popularityFilter.includes(t);
                      const { label, Icon } = POPULARITY_LABELS[t];
                      return (
                        <button
                          key={t}
                          onClick={() =>
                            setPopularityFilter(prev =>
                              active ? prev.filter(x => x !== t) : [...prev, t]
                            )
                          }
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-semibold border transition-all active:scale-95 ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-foreground border-border hover:border-primary/40'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? '' : 'opacity-60'}`} strokeWidth={2.2} />
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => {
                        setCategoryFilter([]);
                        setRarityFilter([]);
                        setPopularityFilter([]);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-display font-semibold text-foreground active:scale-[0.97] transition"
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-bold active:scale-[0.97] transition"
                    >
                      Voir {browseTotal} espèce{browseTotal > 1 ? 's' : ''}
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </section>
          )}

          {viewMode === 'collections' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">Mes collections</h2>
                <button
                  onClick={openAddSlotModal}
                  className="flex items-center gap-1 text-xs font-display font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>

              {subscribedZones.length === 0 && myCollections.length === 0 ? (
                <button
                  onClick={openAddSlotModal}
                  className="w-full rounded-2xl border border-dashed border-border p-6 text-center transition active:scale-[0.98] hover:border-primary/40"
                >
                  <div className="inline-flex w-12 h-12 rounded-2xl bg-primary/15 items-center justify-center mb-2">
                    <Layers className="w-6 h-6 text-primary" strokeWidth={2} />
                  </div>
                  <h3 className="font-display font-bold text-sm text-foreground">Ajoute une zone et/ou une collection</h3>
                  <p className="text-[11px] text-muted-foreground font-display leading-relaxed mt-1 px-2">
                    Suis la faune d'une ville ou d'un département, et complète des séries thématiques (races de chien, papillons, rapaces…).
                  </p>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {subscribedZones.map((zone) => {
                    const d = getDepartement(zone.departmentCode);
                    const p = zoneProgress[zone.id] || { total: 0, captured: 0 };
                    const pct = p.total > 0 ? Math.round((p.captured / p.total) * 100) : 0;
const isCity = zone.kind === 'city';
                    const title = isCity ? (zone.cityName || 'Ville') : (d?.name || zone.departmentCode);
                    const art = getZoneArt(zone.kind);
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setSelectedZoneId(zone.id)}
                        className="group relative overflow-hidden rounded-2xl border border-border text-left transition-all active:scale-[0.97] hover:border-primary/30 hover:shadow-lg"
                      >
                        <img
                          src={art.image}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0" style={{ background: art.overlay }} />
<div className="relative p-4 pt-16">
                          <h3 className="font-display font-bold text-sm text-primary-foreground leading-tight mb-0.5 truncate drop-shadow">{title}</h3>
                          <p className="text-[11px] text-primary-foreground/80 font-display mb-2.5">
                            {p.captured}/{p.total} capturés
                          </p>
                          <div className="w-full h-1.5 rounded-full bg-primary-foreground/25 overflow-hidden">
                            <div className="h-full rounded-full bg-primary-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {myCollections.map(({ group, total, captured }) => {
                    const pct = total > 0 ? Math.round((captured / total) * 100) : 0;
                    const art = getCollectionArt(group.key, group.label);
                    return (
                      <button
                        key={group.key}
                        onClick={() => setSelectedCollectionKey(group.key)}
                        className="group relative overflow-hidden rounded-2xl border border-border text-left transition-all active:scale-[0.97] hover:border-primary/30 hover:shadow-lg"
                      >
                        <img
                          src={art.image}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0" style={{ background: art.overlay }} />
                        <div className="relative p-4 pt-16">
                          <h3 className="font-display font-bold text-sm text-primary-foreground leading-tight mb-0.5 truncate drop-shadow">{group.label}</h3>
                          <p className="text-[11px] text-primary-foreground/80 font-display mb-2.5">
                            {captured}/{total} capturés
                          </p>
                          <div className="w-full h-1.5 rounded-full bg-primary-foreground/25 overflow-hidden">
                            <div className="h-full rounded-full bg-primary-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

              )}
            </section>
          )}



        </div>
        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} communityFinders={selectedFinders} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />
        {deptPickerSheet}
      </main>
    );
  }

  // Category detail: 3x3 binder grid
  const catInfo = selectedCategory === ALL_SPECIES
    ? { name: ALL_SPECIES, total: animals.length, captured: animals.filter(a => a.captured).length }
    : categoryData.find(c => c.name === selectedCategory);

  return (
    <main className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>mon faunex — Toutes les espèces à découvrir · Faunex</title>
        <meta name="description" content="Explore le bestiaire Faunex : +1000 espèces sauvages françaises classées par catégorie et rareté. Découvre la faune autour de toi." />
        <link rel="canonical" href="https://faunex.fr/bestiaire" />
        <meta property="og:title" content="Bestiaire Faunex — +1000 espèces à découvrir" />
        <meta property="og:url" content="https://faunex.fr/bestiaire" />
        <meta property="og:description" content="Catalogue complet de la faune sauvage : oiseaux, mammifères, insectes, reptiles, amphibiens…" />
      </Helmet>
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (activeBreedGroup ? setSelectedBreedGroup(null) : setSelectedCategory(null))}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {activeBreedGroup ? (
                <span className="text-lg shrink-0">{activeBreedGroup.group.emoji}</span>
              ) : (
                (() => {
                  const HeaderIcon = selectedCategory === ALL_SPECIES ? Globe : getCategoryIcon(selectedCategory);
                  return <HeaderIcon className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />;
                })()
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-display font-bold text-foreground truncate">
                  {activeBreedGroup ? activeBreedGroup.group.label : selectedCategory}
                </h1>
                <p className="text-[11px] text-muted-foreground font-display">
                  {activeBreedGroup
                    ? `${activeBreedGroup.captured}/${activeBreedGroup.total} capturés · ${selectedCategory}`
                    : `${catInfo?.captured || 0}/${catInfo?.total || 0} capturés`}
                </p>
              </div>
            </div>
          </div>
        </div>

      </PageHeader>

      <div className="max-w-lg mx-auto px-3 pt-3">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={speciesSearch}
            onChange={(e) => setSpeciesSearch(e.target.value)}
            placeholder={`Rechercher dans ${selectedCategory}…`}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card border border-border text-sm font-display placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          {speciesSearch && (
            <button
              onClick={() => setSpeciesSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        {/* Classement des explorateurs de la catégorie */}
        {!activeBreedGroup && selectedCategory && (
          <CategoryLeaderboard category={selectedCategory === ALL_SPECIES ? 'all' : selectedCategory} />
        )}
        {/* Sub-level: breed groups as horizontal chips (races de chien, de chat…) */}
        {breedGroupsInCategory.length > 0 && (
          <div className="-mx-3 mb-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-3 py-0.5">
              <button
                onClick={() => setSelectedBreedGroup(null)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-[12px] font-display transition-colors ${
                  !activeBreedGroup
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-muted text-muted-foreground font-semibold'
                }`}
              >
                Toutes les espèces
              </button>
              {breedGroupsInCategory.map(({ group, total, captured }) => {
                const active = activeBreedGroup?.group.key === group.key;
                return (
                  <button
                    key={group.key}
                    onClick={() => setSelectedBreedGroup(active ? null : group.key)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-[12px] font-display transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-muted text-muted-foreground font-semibold'
                    }`}
                  >
                    {group.label}
                    <span className={`ml-1.5 ${active ? 'opacity-80' : 'opacity-60'}`}>{captured}/{total}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* 4x4 TCG binder grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {gridAnimals.map((animal, index) => {

            return (
              <div
                key={animal.name}
onClick={() => {
                  if (animal.captured && animal.captureData) {
                    setSelectedFinders(undefined);
                    setSelectedCard(animal.captureData);
                  } else {
                    setSelectedFinders(animal.finders ?? 0);
                    setSelectedCard({
                      id: `uncaptured-${animal.name}`,
                      name: animal.name,
                      scientificName: animal.scientific_name || '',
                      image: '',
                      rarity: animal.rarity as Rarity,
                      category: animal.category,
                      description: '',
                      habitat: '',
                      diet: '',
                      conservation: '',
                      funFact: '',
                      discoveredAt: '',
                      location: '',
                    });
                  }
                }}
                className={`game-tile relative aspect-[3/4] rounded-xl border-2 overflow-hidden cursor-pointer ${
                  animal.captured
                    ? `${rarityBorderColor[animal.rarity] || 'border-border'} bg-card ${tileDepthClass[animal.rarity] || ''}`
                    : 'game-tile--empty border-border/40 bg-muted/30'
                }`}

              >
                {animal.captured && animal.captureData ? (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex-1 overflow-hidden relative">
                      <img
                        src={animal.captureData.image}
                        alt={animal.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'}`} />
                    </div>
                    <div className="px-1.5 py-1 bg-card">
                      <p className="text-[9px] font-display font-bold text-foreground truncate leading-tight">{animal.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <span className="text-lg font-display font-bold text-muted-foreground">
                      {String(index + 1).padStart(3, '0')}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'} opacity-30`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {gridAnimals.length === 0 && breedGroupsInCategory.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-muted-foreground font-display text-sm">Aucune espèce dans cette catégorie</p>
          </div>
        )}

        {selectedCategory === ALL_SPECIES && !speciesQuery && categoryAnimals.length > ALL_GRID_LIMIT && (
          <p className="text-center text-[11px] text-muted-foreground font-display py-4">
            {ALL_GRID_LIMIT} premières espèces affichées · utilise la recherche pour en trouver une précise
          </p>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} communityFinders={selectedFinders} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />

      {/* Flying card overlay for shelve animation */}
      {flyingCardStyle && pendingShelve && (
        <div
          className="shelve-flying-card"
          data-rarity={pendingShelve.rarity}
          style={flyingCardStyle}
        >
          <div className="shelve-card-aura" aria-hidden />
          <img src={pendingShelve.imageUrl} alt={pendingShelve.animalName} />
          <div className="shelve-card-shine" aria-hidden />
          <div className="shelve-card-label">
            <span>Nouvelle découverte</span>
            <strong>{pendingShelve.animalName}</strong>
          </div>
          <div className="shelve-card-sparkles" aria-hidden>
            {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
          </div>
        </div>
      )}
    </main>
  );
};

export default BestiairePage;
