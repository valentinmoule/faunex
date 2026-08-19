import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bell, ChevronLeft, PawPrint, MapPin, Plus, Search, Trash2, X, Building2, Map as MapIcon, Home, Compass, Loader2 } from 'lucide-react';
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
  normalizeCategory,
  rarityBorderColor,
  rarityDot,
  type ZoneSub,
} from '@/lib/bestiary';
import { useBestiaryData } from '@/hooks/useBestiaryData';
import { useCitySearch } from '@/hooks/useCitySearch';
import { useShelveAnimation } from '@/hooks/useShelveAnimation';
import { useZoneSubscriptions } from '@/hooks/useZoneSubscriptions';


const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'mine' | 'categories' | 'territory'>('mine');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'hub' | 'explore'>('hub');
  const [pickerTab, setPickerTab] = useState<'department' | 'city'>('department');
  const [deptSearch, setDeptSearch] = useState('');
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [mineSearch, setMineSearch] = useState('');


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

  const {
    loadingDept,
    detectingHome,
    addDepartment: handleAddDept,
    addCity: handleAddCity,
    removeZone,
    setAsHome: handleSetAsHome,
    detectHome: handleDetectHome,
  } = useZoneSubscriptions({
    userId: session?.user?.id,
    animals,
    subscribedZones,
    setSubscribedZones,
    loadDeptAnimals,
    onZoneReady: handleZoneReady,
  });

  const handleRemoveZone = async (zoneId: string) => {
    await removeZone(zoneId);
    setSelectedZoneId(null);
  };

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
      .filter(a => normalizeCategory(a.category) === selectedCategory)
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter)
      .filter(matchesSearch);
  }, [animals, selectedCategory, rarityFilter, matchesSearch]);

  // Global species search results (across all categories)
  const searchResults = useMemo(() => {
    if (speciesQuery.length < 2) return [];
    return animals
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter)
      .filter(matchesSearch)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .slice(0, 60);
  }, [animals, rarityFilter, matchesSearch, speciesQuery]);

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



  // Single source of truth for "how many captures": the raw approved captures list.

  const hasHomeZone = subscribedZones.some((z) => z.isHome);

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
            {pickerMode === 'explore' && (
              <button
                onClick={() => setPickerMode('hub')}
                className="p-1 -ml-1 rounded-full hover:bg-muted transition"
                aria-label="Retour"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <SheetTitle className="font-display">
              {pickerMode === 'hub' ? 'Ajouter un territoire' : 'Explorer une zone'}
            </SheetTitle>
          </div>
        </SheetHeader>

        {pickerMode === 'hub' && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            <p className="text-xs text-muted-foreground font-display leading-relaxed">
              Suis la faune locale là où tu vis, ou prépare ta prochaine sortie nature.
            </p>

            <button
              onClick={handleDetectHome}
              disabled={detectingHome}
              className="w-full relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-left transition active:scale-[0.98] disabled:opacity-60"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  {detectingHome ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <Home className="w-6 h-6 text-primary" strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-foreground">Chez moi</h3>
                    <span className="text-[9px] font-display font-bold uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                      Auto
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-display leading-relaxed mt-0.5">
                    {hasHomeZone
                      ? 'Mettre à jour ton territoire principal via ta position.'
                      : 'Détecte ta commune et suis la faune autour de toi au quotidien.'}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setPickerMode('explore'); setPickerTab('city'); }}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition active:scale-[0.98] hover:border-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Compass className="w-6 h-6 text-foreground" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-foreground">Explorer une zone</h3>
                  <p className="text-[11px] text-muted-foreground font-display leading-relaxed mt-0.5">
                    Prépare un voyage, une rando ou une visite : ajoute n'importe quelle ville ou département.
                  </p>
                </div>
              </div>
            </button>

            <p className="text-[10px] text-muted-foreground font-display text-center pt-2">
              Tu peux ajouter plusieurs territoires et changer ton « Chez moi » à tout moment.
            </p>
          </div>
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
    const HeaderIcon = selectedZone.isHome ? Home : (isCity ? Building2 : MapPin);
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
                    {selectedZone.isHome && (
                      <span className="text-[9px] font-display font-bold uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">
                        Chez moi
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-display truncate">{subtitle}</p>
                </div>
              </div>
              {!selectedZone.isHome && (
                <button
                  onClick={() => handleSetAsHome(selectedZone.id)}
                  className="p-2 rounded-full hover:bg-primary/10 text-primary transition"
                  aria-label="Définir comme Chez moi"
                  title="Définir comme Chez moi"
                >
                  <Home className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
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
                Catégories
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
              <button
                onClick={() => setViewMode('territory')}
                className={`flex-1 text-xs font-display font-semibold py-2 rounded-full transition-all ${
                  viewMode === 'territory'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Territoires
              </button>
            </div>

            {viewMode !== 'territory' && (
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
                      <div className="w-full h-full flex flex-col">
                        <div className="flex-1 overflow-hidden relative">
                          <img
                            src={animal.image}
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
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {viewMode === 'categories' && (
            <section>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={speciesSearch}
                  onChange={(e) => setSpeciesSearch(e.target.value)}
                  placeholder="Rechercher une espèce ou une catégorie…"
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

              {speciesQuery.length >= 2 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">Résultats</h2>
                    <span className="text-[11px] font-display text-muted-foreground tabular-nums">
                      {searchResults.length} espèce{searchResults.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                      <p className="text-3xl mb-2">🔍</p>
                      <p className="text-xs font-display text-muted-foreground px-6">
                        Aucune espèce ne correspond à « {speciesSearch.trim()} ».
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {searchResults.map((animal) => (
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
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                              <span className="text-base">{getCategoryEmoji(normalizeCategory(animal.category))}</span>
                              <p className="text-[8px] font-display text-muted-foreground text-center leading-tight line-clamp-2">{animal.name}</p>
                              <div className={`w-1.5 h-1.5 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'} opacity-40`} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide mb-3">Catégories</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryData
                      .map(cat => {
                        if (rarityFilter === 'all') return cat;
                        const inCat = animals.filter(
                          a => normalizeCategory(a.category) === cat.name && a.rarity === rarityFilter
                        );
                        return {
                          name: cat.name,
                          total: inCat.length,
                          captured: inCat.filter(a => a.captured).length,
                        };
                      })
                      .filter(cat => cat.total > 0)
                      .map(cat => {
                        const CatIcon = getCategoryIcon(cat.name);
                        const progress = cat.total > 0 ? Math.round((cat.captured / cat.total) * 100) : 0;
                        return (
                          <button
                            key={cat.name}
                            onClick={() => setSelectedCategory(cat.name)}
                            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/30 hover:shadow-md"
                          >
                            <div className="mb-2">
                              <CatIcon className="w-7 h-7 text-primary" strokeWidth={1.75} />
                            </div>
                            <h3 className="font-display font-bold text-sm text-foreground leading-tight mb-1 truncate">{cat.name}</h3>
                            <p className="text-[11px] text-muted-foreground font-display mb-3">
                              {cat.captured}/{cat.total} capturés
                            </p>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </>
              )}
            </section>
          )}

          {viewMode === 'territory' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">Mes territoires</h2>
                <button
                  onClick={() => { setPickerMode('hub'); setShowDeptPicker(true); }}
                  className="flex items-center gap-1 text-xs font-display font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
              {subscribedZones.length === 0 ? (
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5 space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex w-12 h-12 rounded-2xl bg-primary/15 items-center justify-center">
                      <Home className="w-6 h-6 text-primary" strokeWidth={2} />
                    </div>
                    <h3 className="font-display font-bold text-sm text-foreground">Découvre la faune autour de toi</h3>
                    <p className="text-[11px] text-muted-foreground font-display leading-relaxed px-2">
                      Définis ton « Chez moi » pour suivre les espèces de ta région, ou ajoute une zone avant un voyage ou une sortie nature.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDetectHome}
                      disabled={detectingHome}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-xs transition active:scale-95 disabled:opacity-60"
                    >
                      {detectingHome ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Home className="w-4 h-4" strokeWidth={2.25} />
                      )}
                      Chez moi
                    </button>
                    <button
                      onClick={() => { setPickerMode('explore'); setPickerTab('city'); setShowDeptPicker(true); }}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-card border border-border text-foreground font-display font-semibold text-xs transition active:scale-95 hover:border-primary/40"
                    >
                      <Compass className="w-4 h-4" strokeWidth={2.25} />
                      Explorer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {subscribedZones.map((zone) => {
                    const d = getDepartement(zone.departmentCode);
                    const p = zoneProgress[zone.id] || { total: 0, captured: 0 };
                    const pct = p.total > 0 ? Math.round((p.captured / p.total) * 100) : 0;
                    const isCity = zone.kind === 'city';
                    const ZoneIcon = zone.isHome ? Home : (isCity ? Building2 : MapPin);
                    const title = isCity ? (zone.cityName || 'Ville') : (d?.name || zone.departmentCode);
                    const sub = isCity
                      ? `${zone.cityPostcode || ''}${d ? ` · ${d.name}` : ''}`
                      : zone.departmentCode;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setSelectedZoneId(zone.id)}
                        className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all active:scale-[0.97] hover:shadow-md ${
                          zone.isHome
                            ? 'border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-card'
                            : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        {zone.isHome && (
                          <span className="absolute top-2 right-2 text-[9px] font-display font-bold uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                            Chez moi
                          </span>
                        )}
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
  const catInfo = categoryData.find(c => c.name === selectedCategory);

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
              onClick={() => setSelectedCategory(null)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {(() => {
                const HeaderIcon = getCategoryIcon(selectedCategory);
                return <HeaderIcon className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />;
              })()}
              <div className="min-w-0">
                <h1 className="text-lg font-display font-bold text-foreground truncate">
                  {selectedCategory}
                </h1>
                <p className="text-[11px] text-muted-foreground font-display">
                  {catInfo?.captured || 0}/{catInfo?.total || 0} capturés
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
        {/* 4x4 TCG binder grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {categoryAnimals.map((animal, index) => {
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

        {categoryAnimals.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-muted-foreground font-display text-sm">Aucune espèce dans cette catégorie</p>
          </div>
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
