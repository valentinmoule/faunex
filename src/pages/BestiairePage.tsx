import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, Bell } from 'lucide-react';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BestiaryAnimal {
  animal_name: string;
  scientific_name: string | null;
  image_url: string;
  rarity: string;
  category: string | null;
  captured: boolean;
}

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const rarityOrder: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};

const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<BestiaryAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch all distinct approved animals (from all users)
      const { data: allCaptures } = await supabase
        .from('captures')
        .select('animal_name, scientific_name, image_url, rarity, category')
        .eq('status', 'approved');

      // Fetch user's own approved captures
      const { data: userCaptures } = await supabase
        .from('captures')
        .select('animal_name')
        .eq('user_id', session.user.id)
        .eq('status', 'approved');

      const userCapturedNames = new Set(
        (userCaptures || []).map((c) => c.animal_name.toLowerCase())
      );

      // Deduplicate by animal_name (keep first occurrence)
      const seen = new Set<string>();
      const unique: BestiaryAnimal[] = [];
      for (const c of allCaptures || []) {
        const key = c.animal_name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push({
          animal_name: c.animal_name,
          scientific_name: c.scientific_name,
          image_url: c.image_url,
          rarity: c.rarity,
          category: c.category,
          captured: userCapturedNames.has(key),
        });
      }

      // Sort: captured first, then by rarity
      unique.sort((a, b) => {
        if (a.captured !== b.captured) return a.captured ? -1 : 1;
        return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
      });

      setAnimals(unique);
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

  const filtered = animals.filter((a) => {
    if (filter !== 'all' && a.rarity !== filter) return false;
    if (search && !a.animal_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const discoveredCount = animals.filter((a) => a.captured).length;

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-display font-bold text-primary">Bestiaire</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-display">
                {discoveredCount}/{animals.length} découverts
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

      {/* Rarity filter chips */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {rarityFilters.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
                filter === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {r === 'all' ? 'Tous' : RARITY_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">Chargement…</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((animal, i) => (
                <div
                  key={animal.animal_name}
                  className="relative overflow-hidden rounded-2xl border-2 border-border bg-muted/30 text-left w-full"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={animal.image_url}
                      alt={animal.captured ? animal.animal_name : '???'}
                      className={`w-full h-full object-cover transition-all ${
                        animal.captured ? '' : 'grayscale brightness-[0.3]'
                      }`}
                      loading="lazy"
                    />
                    {!animal.captured && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    {/* Rarity badge */}
                    <div
                      className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${
                        animal.captured
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {RARITY_LABELS[animal.rarity as Rarity] || animal.rarity}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className={`font-display font-bold text-sm leading-tight ${
                      animal.captured ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {animal.captured ? animal.animal_name : '???'}
                    </h3>
                    <p className="text-[11px] text-muted-foreground italic">
                      {animal.captured ? animal.scientific_name : '???'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {animal.captured ? animal.category : '???'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-muted-foreground font-display">Aucun animal trouvé</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default BestiairePage;
