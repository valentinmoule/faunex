import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, Bell, CheckCircle, PawPrint, Bird, Fish, Bug, Turtle, Rabbit, Shell, Waves, ChevronDown, MapPin, List, Map, type LucideIcon } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { type Rarity, type AnimalCard, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CardDetailSheet from '@/components/CardDetailSheet';

interface BestiaryAnimal {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string;
  captured: boolean;
  captureData?: AnimalCard;
  habitat?: string;
  zone?: string; // location where others found it
}

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'mythic'];

const rarityOrder: Record<string, number> = {
  common: 0, rare: 1, epic: 2, mythic: 3,
};

const rarityIconBg: Record<string, string> = {
  common: 'bg-rarity-common/10 text-rarity-common border-rarity-common/30',
  rare: 'bg-rarity-rare/10 text-rarity-rare border-rarity-rare/30',
  epic: 'bg-rarity-epic/10 text-rarity-epic border-rarity-epic/30',
  mythic: 'bg-rarity-mythic/10 text-rarity-mythic border-rarity-mythic/30',
};

const getCategoryIcon = (category: string): LucideIcon => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return Bird;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish;
  if (cat.includes('insecte')) return Bug;
  if (cat.includes('reptile')) return Turtle;
  if (cat.includes('amphibien')) return Rabbit;
  if (cat.includes('arachnide')) return Bug;
  if (cat.includes('crustacé')) return Shell;
  if (cat.includes('mollusque')) return Shell;
  if (cat.includes('mammifère') && cat.includes('marin')) return Waves;
  if (cat.includes('mammifère')) return PawPrint;
  return PawPrint;
};

const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<BestiaryAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(100);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch ALL animals with pagination (Supabase default limit is 1000)
      let allAnimals: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('animals')
          .select('name, scientific_name, rarity, category')
          .order('name')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (!data || data.length === 0) break;
        allAnimals = allAnimals.concat(data);
        if (data.length < pageSize) break;
        page++;
      }

      const { data: userCaptures } = await supabase
        .from('captures')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'approved');

      // Fetch zone hints from ALL approved captures (location + habitat per animal)
      const { data: allCaptures } = await supabase
        .from('captures')
        .select('animal_name, location, habitat')
        .eq('status', 'approved')
        .not('location', 'is', null);

      // Build a map: animal_name -> { locations, habitat }
      const zoneHints = new Map<string, { locations: Set<string>; habitat: string }>();
      (allCaptures || []).forEach((c) => {
        const key = c.animal_name.toLowerCase();
        if (!zoneHints.has(key)) {
          zoneHints.set(key, { locations: new Set(), habitat: '' });
        }
        const hint = zoneHints.get(key)!;
        if (c.location && c.location.trim()) hint.locations.add(c.location.trim());
        if (c.habitat && !hint.habitat) hint.habitat = c.habitat;
      });

      const capturesByName = new Map<string, any>();
      (userCaptures || []).forEach((c) => {
        capturesByName.set(c.animal_name.toLowerCase(), c);
      });

      const list: BestiaryAnimal[] = allAnimals.map((a: any) => {
        const capture = capturesByName.get(a.name.toLowerCase());
        const hint = zoneHints.get(a.name.toLowerCase());
        return {
          name: a.name,
          scientific_name: a.scientific_name,
          rarity: a.rarity,
          category: a.category,
          captured: !!capture,
          zone: hint ? Array.from(hint.locations).slice(0, 2).join(', ') : undefined,
          habitat: hint?.habitat || undefined,
          captureData: capture ? {
            id: capture.id,
            name: capture.animal_name,
            scientificName: capture.scientific_name || '',
            image: capture.image_url,
            rarity: capture.rarity as Rarity,
            category: capture.category || '',
            description: capture.description || '',
            habitat: capture.habitat || '',
            diet: capture.diet || '',
            conservation: capture.conservation || '',
            funFact: capture.fun_fact || '',
            discoveredAt: capture.created_at,
            location: capture.location || '',
          } : undefined,
        };
      });

      // Sort: captured first, then alphabetical
      list.sort((a, b) => {
        if (a.captured !== b.captured) return a.captured ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr');
      });

      setAnimals(list);
      setLoading(false);
    };

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    fetchData();
    fetchUnread();
  }, [session]);

  // Get unique categories (merge "X" and "X (monde)" into one)
  const normalizeCategory = (cat: string) => cat.replace(/\s*\(monde\)$/i, '');

  const categories = useMemo(() => {
    const cats = new Set(animals.map(a => normalizeCategory(a.category)));
    return ['Tous', ...Array.from(cats).sort()];
  }, [animals]);

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      if (filter !== 'all' && a.rarity !== filter) return false;
      if (categoryFilter !== 'Tous' && normalizeCategory(a.category) !== categoryFilter) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [animals, filter, categoryFilter, search]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(100);
  }, [filter, categoryFilter, search]);

  const discoveredCount = animals.filter((a) => a.captured).length;
  const visibleAnimals = filtered.slice(0, displayCount);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-display font-bold text-primary">Bestiaire</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-display">
                {discoveredCount}/{animals.length}
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

          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un animal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
              />
            </div>
            <div className="relative w-1/4 min-w-[80px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none w-full h-full pl-3 pr-7 rounded-xl text-xs font-display font-semibold bg-muted border-none text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Rarity filter chips */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-bold border transition-all duration-300 flex items-center gap-1 active:scale-95 ${
                filter === 'all'
                  ? 'bg-foreground/10 text-foreground border-foreground/30 shadow-sm'
                  : 'bg-muted text-muted-foreground border-border hover:bg-foreground/5 hover:text-foreground hover:border-foreground/20'
              }`}
            >
              Tous
            </button>
            {rarityFilters.filter(r => r !== 'all').map((r) => {
              const isActive = filter === r;
              const colorClasses = r === 'common'
                ? isActive ? 'bg-rarity-common/20 text-rarity-common border-rarity-common/50 shadow-[0_0_10px_hsla(0,0%,60%,0.2)]' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-common/10 hover:text-rarity-common hover:border-rarity-common/30'
                : r === 'rare'
                ? isActive ? 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare/50 shadow-[0_0_12px_hsla(210,70%,55%,0.25)]' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-rare/10 hover:text-rarity-rare hover:border-rarity-rare/30'
                : r === 'epic'
                ? isActive ? 'bg-rarity-epic/20 text-rarity-epic border-rarity-epic/50 shadow-[0_0_14px_hsla(270,70%,60%,0.3)]' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-epic/10 hover:text-rarity-epic hover:border-rarity-epic/30'
                : isActive ? 'bg-rarity-mythic/20 text-rarity-mythic border-rarity-mythic/50 shadow-[0_0_16px_hsla(42,85%,55%,0.35)]' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-mythic/10 hover:text-rarity-mythic hover:border-rarity-mythic/30';

              const dot = r === 'common' ? 'bg-rarity-common' : r === 'rare' ? 'bg-rarity-rare' : r === 'epic' ? 'bg-rarity-epic' : r === 'mythic' ? 'bg-rarity-mythic' : '';

              return (
                <button
                  key={r}
                  onClick={() => setFilter(filter === r ? 'all' : r)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-bold border transition-all duration-300 flex items-center gap-1 active:scale-95 ${colorClasses} ${isActive ? 'bestiary-filter-glow' : ''} ${r === 'mythic' ? 'mythic-filter-shimmer' : ''}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dot} ${isActive ? 'animate-pulse' : ''}`} />
                  {RARITY_LABELS[r as Rarity]}
                </button>
              );
            })}
        </div>
      </div>

      {/* List */}
      <div className="max-w-lg mx-auto px-4 pt-2">
        <p className="text-xs text-muted-foreground font-display mb-2">{filtered.length} espèces</p>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">Chargement…</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleAnimals.map((animal) => (
              <div
                key={animal.name}
                onClick={() => animal.captured && animal.captureData && setSelectedCard(animal.captureData)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                  animal.captured
                    ? 'bg-card border-border cursor-pointer active:bg-muted/50'
                    : 'bg-muted/40 border-border/50'
                }`}
              >
                {/* Category icon */}
                {(() => {
                  const Icon = getCategoryIcon(animal.category);
                  return (
                    <div className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center ${
                      animal.captured
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted/60 text-muted-foreground/40 border-border/40'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  );
                })()}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-display font-bold text-sm leading-tight truncate ${
                    animal.captured ? 'text-foreground' : 'text-muted-foreground/60'
                  }`}>
                    {animal.name}
                  </h3>
                  <p className={`text-[11px] italic truncate ${
                    animal.captured ? 'text-muted-foreground' : 'text-muted-foreground/30'
                  }`}>
                    {animal.captured ? (animal.scientific_name || '—') : '???'}
                  </p>
                  {/* Zone hint for uncaptured animals */}
                  {!animal.captured && (animal.zone || animal.habitat) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-primary/50 shrink-0" />
                      <p className="text-[10px] text-primary/60 font-display truncate">
                        {animal.zone || animal.habitat}
                      </p>
                    </div>
                  )}
                </div>

                {/* Category + status */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-display hidden sm:inline ${animal.captured ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}>
                    {animal.category}
                  </span>
                  {animal.captured ? (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                  )}
                </div>
              </div>
            ))}

            {/* Load more button */}
            {displayCount < filtered.length && (
              <button
                onClick={() => setDisplayCount(prev => prev + 100)}
                className="w-full py-3 text-sm font-display font-semibold text-primary hover:bg-muted rounded-xl transition-colors"
              >
                Voir plus ({filtered.length - displayCount} restants)
              </button>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-muted-foreground font-display">Aucun animal trouvé</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default BestiairePage;
