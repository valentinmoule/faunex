import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, Bell, CheckCircle, PawPrint, Bird, Fish, Bug, Turtle, Rabbit, Shell, Waves, type LucideIcon } from 'lucide-react';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BestiaryAnimal {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string;
  captured: boolean;
}

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const rarityOrder: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};

const rarityIconBg: Record<string, string> = {
  common: 'bg-rarity-common/10 text-rarity-common border-rarity-common/30',
  uncommon: 'bg-rarity-uncommon/10 text-rarity-uncommon border-rarity-uncommon/30',
  rare: 'bg-rarity-rare/10 text-rarity-rare border-rarity-rare/30',
  epic: 'bg-rarity-epic/10 text-rarity-epic border-rarity-epic/30',
  legendary: 'bg-rarity-legendary/10 text-rarity-legendary border-rarity-legendary/30',
  mythic: 'bg-rarity-mythic/10 text-rarity-mythic border-rarity-mythic/30',
};

const rarityEmoji: Record<string, string> = {
  common: '🐾',
  uncommon: '🦎',
  rare: '💎',
  epic: '🔮',
  legendary: '⭐',
  mythic: '🔥',
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
        .select('animal_name')
        .eq('user_id', session.user.id)
        .eq('status', 'approved');

      const userCapturedNames = new Set(
        (userCaptures || []).map((c) => c.animal_name.toLowerCase())
      );

      const list: BestiaryAnimal[] = allAnimals.map((a: any) => ({
        name: a.name,
        scientific_name: a.scientific_name,
        rarity: a.rarity,
        category: a.category,
        captured: userCapturedNames.has(a.name.toLowerCase()),
      }));

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

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(animals.map(a => a.category));
    return ['Tous', ...Array.from(cats).sort()];
  }, [animals]);

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      if (filter !== 'all' && a.rarity !== filter) return false;
      if (categoryFilter !== 'Tous' && a.category !== categoryFilter) return false;
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un animal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
            />
          </div>
        </div>
      </header>

      {/* Category filter */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
                categoryFilter === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Rarity filter chips */}
      <div className="max-w-lg mx-auto px-4 pt-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {rarityFilters.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
                filter === r
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {r === 'all' ? 'Toutes raretés' : RARITY_LABELS[r]}
            </button>
          ))}
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                  animal.captured
                    ? 'bg-card border-border'
                    : 'bg-muted/40 border-border/50'
                }`}
              >
                {/* Rarity icon */}
                <div className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center text-base ${
                  animal.captured
                    ? rarityIconBg[animal.rarity] || 'bg-muted text-muted-foreground border-border'
                    : 'bg-muted/60 text-muted-foreground/40 border-border/40'
                }`}>
                  {animal.captured ? (rarityEmoji[animal.rarity] || '🐾') : '?'}
                </div>

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
    </main>
  );
};

export default BestiairePage;
