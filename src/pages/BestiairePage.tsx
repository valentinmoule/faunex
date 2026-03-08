import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, Bell, CheckCircle } from 'lucide-react';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BestiaryAnimal {
  animal_name: string;
  scientific_name: string | null;
  rarity: string;
  category: string | null;
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch all distinct approved animals (from all users)
      const { data: allCaptures } = await supabase
        .from('captures')
        .select('animal_name, scientific_name, rarity, category')
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

      // Deduplicate by animal_name
      const seen = new Set<string>();
      const unique: BestiaryAnimal[] = [];
      for (const c of allCaptures || []) {
        const key = c.animal_name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push({
          animal_name: c.animal_name,
          scientific_name: c.scientific_name,
          rarity: c.rarity,
          category: c.category,
          captured: userCapturedNames.has(key),
        });
      }

      // Sort: captured first, then by rarity desc (rarest first)
      unique.sort((a, b) => {
        if (a.captured !== b.captured) return a.captured ? -1 : 1;
        return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
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

  // Compteurs par rareté
  const countByRarity = rarityFilters.filter(r => r !== 'all').map(r => {
    const total = animals.filter(a => a.rarity === r).length;
    const captured = animals.filter(a => a.rarity === r && a.captured).length;
    return { rarity: r as Rarity, total, captured };
  }).filter(c => c.total > 0);

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

          {/* Compteurs par rareté */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
            {countByRarity.map(({ rarity, total, captured }) => (
              <div key={rarity} className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-display font-semibold ${rarityIconBg[rarity]}`}>
                <span>{rarityEmoji[rarity]}</span>
                <span>{captured}/{total}</span>
              </div>
            ))}
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

      {/* List */}
      <div className="max-w-lg mx-auto px-4 pt-3 space-y-2">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">Chargement…</p>
          </div>
        ) : (
          <>
            {filtered.map((animal) => (
              <div
                key={animal.animal_name}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  animal.captured
                    ? 'bg-card border-border'
                    : 'bg-muted/40 border-border/50'
                }`}
              >
                {/* Rarity icon */}
                <div className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center text-lg ${
                  animal.captured
                    ? rarityIconBg[animal.rarity] || 'bg-muted text-muted-foreground border-border'
                    : 'bg-muted/60 text-muted-foreground/40 border-border/40'
                }`}>
                  {animal.captured ? (rarityEmoji[animal.rarity] || '🐾') : '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-display font-bold text-sm leading-tight truncate ${
                    animal.captured ? 'text-foreground' : 'text-muted-foreground/50'
                  }`}>
                    {animal.captured ? animal.animal_name : '???'}
                  </h3>
                  <p className={`text-[11px] italic truncate ${
                    animal.captured ? 'text-muted-foreground' : 'text-muted-foreground/30'
                  }`}>
                    {animal.captured ? (animal.scientific_name || '—') : '???'}
                  </p>
                </div>

                {/* Category + status */}
                <div className="flex items-center gap-2 shrink-0">
                  {animal.captured ? (
                    <>
                      <span className="text-[10px] text-muted-foreground font-display">{animal.category}</span>
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </>
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground/30" />
                  )}
                </div>
              </div>
            ))}

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
