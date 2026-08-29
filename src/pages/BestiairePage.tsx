import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bell, ChevronLeft, PawPrint, MapPin, Plus, Search, Trash2, X, Building2, Map as MapIcon, Compass, Layers, Loader2, Crown, Globe, SlidersHorizontal } from 'lucide-react';
import { type Rarity, type AnimalCard, RARITY_LABELS } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import CardDetailSheet from '@/components/CardDetailSheet';
import LoadingScreen from '@/components/LoadingScreen';
import { DEPARTEMENTS, getDepartement } from '@/data/departements';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  buildCityAnimalSet,
  getCategoryEmoji,
  getCategoryIcon,
  getSpeciesEmoji,
  normalizeCategory,
  rarityBadge,
  rarityBorderColor,
  rarityDot,
  type ZoneSub,
} from '@/lib/bestiary';
import { MIN_BREEDS_PER_GROUP, BREED_GROUPS, getBreedGroup, getSpeciesGroup, type BreedGroup } from '@/lib/breedGroups';
import { useBestiaryData } from '@/hooks/useBestiaryData';
import { useCitySearch } from '@/hooks/useCitySearch';
import { useShelveAnimation } from '@/hooks/useShelveAnimation';
import { useZoneSubscriptions } from '@/hooks/useZoneSubscriptions';
import { useSpeciesCollections } from '@/hooks/useSpeciesCollections';
import CategoryLeaderboard from '@/components/CategoryLeaderboard';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

/** Zones + collections combinées, limite gratuite. */
const FREE_SLOT_LIMIT = 3;

/** Catégorie virtuelle regroupant toutes les espèces + classement général. */
const ALL_SPECIES = 'Toutes les espèces';
const ALL_GRID_LIMIT = 200;


const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBreedGroup, setSelectedBreedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'mine' | 'categories' | 'collections'>('mine');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
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
  const [filterOpen, setFilterOpen] = useState(false);

  // Scroll to top when entering a category detail view
  useEffect(() => {
    if (selectedCategory) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [selectedCategory]);

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

  const { citySearch, setCitySearch, cityResults, setCityResults, cityLoading } =
    useCitySearch(pickerTab === 'city');

  const { pendingShelve, flyingCardStyle, flashSlotName, slotRefs } = useShelveAnimation({
    animals,
    loading,
    selectedCategory,
    setSelectedCategory,
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
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
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

  // Animals for selected category (with rarity filter + search)
  const categoryAnimals = useMemo(() => {
    if (!selectedCategory) return [];
    return animals
      .filter(a => selectedCategory === ALL_SPECIES || normalizeCategory(a.category) === selectedCategory)
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter)
      .filter(matchesSearch);
  }, [animals, selectedCategory, rarityFilter, matchesSearch]);

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
    const hiddenKeys = new Set(breedGroupsInCategory.filter(e => e.group.breeds).map(e => e.group.key));
    const filtered = categoryAnimals.filter(a => {
      const group = getBreedGroup(a.scientific_name);
      return !group || !hiddenKeys.has(group.key);
    });
    // « Toutes les espèces » peut contenir des milliers de cartes : on plafonne l'affichage.
    if (selectedCategory === ALL_SPECIES && !speciesQuery) return filtered.slice(0, ALL_GRID_LIMIT);
    return filtered;
  }, [categoryAnimals, breedGroupsInCategory, activeBreedGroup, selectedCategory, speciesQuery]);



  // Browse view: all species, filtered by category chips + rarity + search
  const browseAnimals = useMemo(() => {
    return animals
      .filter(a => categoryFilter.length === 0 || categoryFilter.includes(normalizeCategory(a.category)))
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter)
      .filter(matchesSearch)
      .sort((a, b) => Number(b.captured) - Number(a.captured) || a.name.localeCompare(b.name, 'fr'));
  }, [animals, categoryFilter, rarityFilter, matchesSearch]);

  // Infinite scroll : 50 espèces par lot, chargement automatique en fin de liste
  const BROWSE_PAGE = 50;
  const [browseVisible, setBrowseVisible] = useState(BROWSE_PAGE);
  const browseSentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset quand les filtres/recherche changent
  useEffect(() => {
    setBrowseVisible(BROWSE_PAGE);
  }, [categoryFilter, rarityFilter, matchesSearch]);

  const visibleBrowseAnimals = useMemo(
    () => browseAnimals.slice(0, browseVisible),
    [browseAnimals, browseVisible],
  );

  useEffect(() => {
    const el = browseSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setBrowseVisible(v => (v < browseAnimals.length ? v + BROWSE_PAGE : v));
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [browseAnimals.length]);

  const activeFilterCount = categoryFilter.length + (rarityFilter !== 'all' ? 1 : 0);

  const browseTotal = useMemo(
    () => animals
      .filter(a => categoryFilter.length === 0 || categoryFilter.includes(normalizeCategory(a.category)))
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter)
      .filter(matchesSearch).length,
    [animals, categoryFilter, rarityFilter, matchesSearch],
  );

  // Flat list of my own captures (one entry per capture), filtered + sorted by most recent
  const myCapturedAnimals = useMemo(() => {
    const q = normalizeSearch(mineSearch);
    return myCaptures
      .filter(c => rarityFilter === 'all' || c.rarity === rarityFilter)
      .filter(c =>
        !q ||
        normalizeSearch(c.name).includes(q) ||
        normalizeSearch(c.scientificName || '').includes(q) ||
        normalizeSearch(c.category || '').includes(q) ||
        normalizeSearch(c.location || '').includes(q)
      )
      .sort((a, b) => +new Date(b.discoveredAt || 0) - +new Date(a.discoveredAt || 0));
  }, [myCaptures, rarityFilter, mineSearch]);


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
    return animals
      .filter((a) => set.has(a.name.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
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
    const HeaderIcon = isCity ? Building2 : MapPin;
    return (
      <main className="min-h-screen bg-background pb-24">
        <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedZoneId(null)}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <HeaderIcon className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-lg font-display font-bold text-foreground truncate">{title}</h1>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-display truncate">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveZone(selectedZone.id)}
                className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition"
                aria-label="Supprimer la rubrique"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </PageHeader>

        <div className="max-w-lg mx-auto px-3 pt-3">
          {isCity && (
            <p className="text-[11px] text-muted-foreground font-display text-center mb-3 px-3">
              Espèces présentes dans le territoire de {dept?.name || selectedZone.departmentCode}.
            </p>
          )}
          {zoneAnimals.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-muted-foreground font-display text-sm">
                Aucune espèce répertoriée pour cette zone pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {zoneAnimals.map((animal, index) => (
                <div
                  key={animal.name}
                  onClick={() => {
                    if (animal.captured && animal.captureData) {
                      setSelectedCard(animal.captureData);
                    } else {
                      setSelectedCard({
                        id: `uncaptured-${animal.name}`,
                        name: animal.name,
                        scientificName: animal.scientific_name || '',
                        image: '',
                        rarity: animal.rarity as Rarity,
                        category: animal.category,
                        description: '', habitat: '', diet: '', conservation: '', funFact: '',
                        discoveredAt: '', location: '',
                      });
                    }
                  }}
                  className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${
                    animal.captured
                      ? `${rarityBorderColor[animal.rarity] || 'border-border'} bg-card`
                      : 'border-border/40 bg-muted/30'
                  }`}
                >
                  {animal.captured && animal.captureData ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex-1 overflow-hidden relative">
                        <img src={animal.captureData.image} alt={animal.name} className="w-full h-full object-cover" loading="lazy" />
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
              ))}
            </div>
          )}
        </div>

        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />
        {deptPickerSheet}
      </main>
    );
  }

  // Species collection detail view (races de chien, papillons…)
  if (selectedCollection) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCollectionKey(null)}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-lg shrink-0">{selectedCollection.group.emoji}</span>
                <div className="min-w-0">
                  <h1 className="text-lg font-display font-bold text-foreground truncate">{selectedCollection.group.label}</h1>
                  <p className="text-[11px] text-muted-foreground font-display">
                    {selectedCollection.captured}/{selectedCollection.total} capturés
                  </p>
                </div>
              </div>
              <button
                onClick={() => { removeCollection(selectedCollection.group.key); setSelectedCollectionKey(null); }}
                className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition"
                aria-label="Retirer la collection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </PageHeader>

        <div className="max-w-lg mx-auto px-3 pt-3 space-y-4">
          {collectionLeaderboardCategory && (
            <CategoryLeaderboard category={collectionLeaderboardCategory} />
          )}
          <div className="grid grid-cols-4 gap-1.5">

            {collectionAnimals.map((animal, index) => (
              <div
                key={animal.name}
                onClick={() => {
                  if (animal.captured && animal.captureData) {
                    setSelectedCard(animal.captureData);
                  } else {
                    setSelectedCard({
                      id: `uncaptured-${animal.name}`,
                      name: animal.name,
                      scientificName: animal.scientific_name || '',
                      image: '',
                      rarity: animal.rarity as Rarity,
                      category: animal.category,
                      description: '', habitat: '', diet: '', conservation: '', funFact: '',
                      discoveredAt: '', location: '',
                    });
                  }
                }}
                className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${
                  animal.captured
                    ? `${rarityBorderColor[animal.rarity] || 'border-border'} bg-card`
                    : 'border-border/40 bg-muted/30'
                }`}
              >
                {animal.captured && animal.captureData ? (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex-1 overflow-hidden relative">
                      <img src={animal.captureData.image} alt={animal.name} className="w-full h-full object-cover" loading="lazy" />
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
            ))}
          </div>
        </div>

        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />
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
                <span className="text-sm text-muted-foreground font-display">
                  {myCaptures.length} espèce{myCaptures.length > 1 ? 's' : ''}
                </span>

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
            {viewMode !== 'collections' && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
                {(['all', 'common', 'rare', 'epic', 'mythic'] as const).map((r) => {
                  const active = rarityFilter === r;
                  const label = r === 'all' ? 'Toutes' : RARITY_LABELS[r as Rarity];
                  return (
                    <button
                      key={r}
                      onClick={() => setRarityFilter(r)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold border transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                      }`}
                    >
                      {r !== 'all' && (
                        <span className={`w-1.5 h-1.5 rounded-full ${rarityDot[r] || 'bg-muted-foreground'}`} />
                      )}
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {viewMode === 'mine' && (
            <section>
              <div className="relative mb-2">
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
                      : rarityFilter === 'all'
                      ? "Tu n'as pas encore de capture. Pars en exploration !"
                      : `Aucune capture ${RARITY_LABELS[rarityFilter as Rarity].toLowerCase()} pour l'instant.`}

                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {myCapturedAnimals.map((animal) => (
                    <div
                      key={animal.id}
                      onClick={() => setSelectedCard(animal)}
                      className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${rarityBorderColor[animal.rarity] || 'border-border'} bg-card`}
                    >
                      <img
                        src={animal.image}
                        alt={animal.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-1 right-1">
                        <span className={`inline-flex items-center px-1 py-px rounded-md text-[8px] font-display font-bold uppercase tracking-wide backdrop-blur-sm ${rarityBadge[animal.rarity] || 'bg-black/60 text-white'}`}>
                          {RARITY_LABELS[animal.rarity] || animal.rarity}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8">
                        <p className="text-xs font-display font-bold text-white truncate leading-tight">
                          {animal.name}
                        </p>
                        {animal.scientificName && (
                          <p className="text-[9px] font-body italic text-white/80 truncate">
                            {animal.scientificName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

              {/* Chips des catégories actives */}
              {categoryFilter.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {categoryFilter.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(prev => prev.filter(c => c !== cat))}
                      className="flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-display font-semibold active:scale-95 transition"
                    >
                      {getCategoryEmoji(cat)} {cat}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                  <button
                    onClick={() => setCategoryFilter([])}
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
                  {browseTotal} espèce{browseTotal > 1 ? 's' : ''}
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
                <>
<div className="grid grid-cols-2 gap-2">
                    {visibleBrowseAnimals.map((animal) => (
                      <div
                        key={animal.name}
                        onClick={() => {
                          if (animal.captured && animal.captureData) {
                            setSelectedCard(animal.captureData);
                          } else {
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
                        className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${
                          animal.captured
                            ? `${rarityBorderColor[animal.rarity] || 'border-border'} bg-card`
                            : 'border-border/40 bg-muted/30'
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
                            <div className="absolute top-1 right-1">
                              <span className={`inline-flex items-center px-1 py-px rounded-md text-[8px] font-display font-bold uppercase tracking-wide backdrop-blur-sm ${rarityBadge[animal.rarity] || 'bg-black/60 text-white'}`}>
                                {RARITY_LABELS[animal.rarity] || animal.rarity}
                              </span>
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
                          <>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-4xl leading-none opacity-60">{getSpeciesEmoji(animal.name, animal.category)}</span>
                            </div>
                            <div className="absolute top-1 right-1">
                              <span className={`inline-flex items-center px-1 py-px rounded-md text-[8px] font-display font-bold uppercase tracking-wide ${rarityBadge[animal.rarity] || 'bg-muted text-muted-foreground'}`}>
                                {RARITY_LABELS[animal.rarity] || animal.rarity}
                              </span>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5 pt-8">
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
                        )}
                      </div>
                    ))}
                  </div>
                  {browseTotal > browseAnimals.length && (
                    <p className="text-center text-[11px] text-muted-foreground font-display py-4">
                      {browseAnimals.length} premières espèces affichées · affine ta recherche ou tes filtres
                    </p>
                  )}
                </>
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
                          <span>{getCategoryEmoji(cat.name)}</span>
                          {cat.name}
                          <span className={active ? 'opacity-80' : 'opacity-50'}>{cat.total}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-display font-bold mt-5 mb-2">Rareté</p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'common', 'rare', 'epic', 'mythic'] as const).map((r) => {
                      const active = rarityFilter === r;
                      const label = r === 'all' ? 'Toutes' : RARITY_LABELS[r as Rarity];
                      return (
                        <button
                          key={r}
                          onClick={() => setRarityFilter(r)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-semibold border transition-all active:scale-95 ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-foreground border-border hover:border-primary/40'
                          }`}
                        >
                          {r !== 'all' && (
                            <span className={`w-1.5 h-1.5 rounded-full ${rarityDot[r] || 'bg-muted-foreground'}`} />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => {
                        setCategoryFilter([]);
                        setRarityFilter('all');
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
                    const ZoneIcon = isCity ? Building2 : MapPin;
                    const title = isCity ? (zone.cityName || 'Ville') : (d?.name || zone.departmentCode);
                    const sub = isCity
                      ? `${zone.cityPostcode || ''}${d ? ` · ${d.name}` : ''}`
                      : zone.departmentCode;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setSelectedZoneId(zone.id)}
                        className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <ZoneIcon className="w-5 h-5 text-primary" strokeWidth={1.75} />
                          <span className="text-[10px] font-display font-bold text-muted-foreground tabular-nums truncate">{sub}</span>
                        </div>
                        <h3 className="font-display font-bold text-sm text-foreground leading-tight mb-1 truncate">{title}</h3>
                        <p className="text-[11px] text-muted-foreground font-display mb-3">
                          {p.captured}/{p.total} capturés
                        </p>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}

                  {myCollections.map(({ group, total, captured }) => {
                    const pct = total > 0 ? Math.round((captured / total) * 100) : 0;
                    return (
                      <button
                        key={group.key}
                        onClick={() => setSelectedCollectionKey(group.key)}
                        className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="text-xl mb-2 leading-none h-5 flex items-center">{group.emoji}</div>
                        <h3 className="font-display font-bold text-sm text-foreground leading-tight mb-1 truncate">{group.label}</h3>
                        <p className="text-[11px] text-muted-foreground font-display mb-3">
                          {captured}/{total} capturés
                        </p>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}



        </div>
        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />
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

            const slotKey = animal.name.toLowerCase();
            const isFlashing = flashSlotName === slotKey;
            return (
              <div
                key={animal.name}
                ref={(el) => { slotRefs.current[slotKey] = el; }}
                onClick={() => {
                  if (animal.captured && animal.captureData) {
                    setSelectedCard(animal.captureData);
                  } else {
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
                className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${
                  animal.captured
                    ? `${rarityBorderColor[animal.rarity] || 'border-border'} bg-card`
                    : 'border-border/40 bg-muted/30'
                } ${isFlashing ? 'shelve-slot-flash' : ''}`}
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

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} onDeleted={(id) => setMyCaptures(prev => prev.filter(c => c.id !== id))} />

      {/* Flying card overlay for shelve animation */}
      {flyingCardStyle && pendingShelve && (
        <div className="shelve-flying-card" style={flyingCardStyle}>
          <img src={pendingShelve.imageUrl} alt={pendingShelve.animalName} />
        </div>
      )}
    </main>
  );
};

export default BestiairePage;
