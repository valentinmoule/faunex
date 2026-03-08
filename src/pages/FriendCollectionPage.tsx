import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserMinus } from 'lucide-react';
import AnimalCardComponent from '@/components/AnimalCardComponent';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const FriendCollectionPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [search, setSearch] = useState('');
  const [captures, setCaptures] = useState<AnimalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [friendRelationId, setFriendRelationId] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch profile and shared captures in parallel
      const [profileRes, capturesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('captures')
          .select('*')
          .eq('user_id', userId)
          .eq('shared', true)
          .order('created_at', { ascending: false }),
      ]);

      if (profileRes.data) {
        setProfileName(profileRes.data.display_name || profileRes.data.username || 'Explorateur');
      }

      if (!capturesRes.error && capturesRes.data) {
        setCaptures(capturesRes.data.map((c: any) => ({
          id: c.id,
          name: c.animal_name,
          scientificName: c.scientific_name || '',
          image: c.image_url,
          rarity: c.rarity as Rarity,
          category: c.category || '',
          description: c.description || '',
          habitat: c.habitat || '',
          diet: c.diet || '',
          conservation: c.conservation || '',
          funFact: c.fun_fact || '',
          discoveredAt: c.created_at,
          location: c.location || '',
        })));
      }
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const filtered = captures.filter(c => {
    if (filter !== 'all' && c.rarity !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-display font-bold text-foreground truncate">Faunex de {profileName}</h1>
              <p className="text-xs text-muted-foreground">{captures.length} espèces partagées</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une espèce..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
            />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {rarityFilters.map(r => (
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

      <div className="max-w-lg mx-auto px-4 pt-3">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">Chargement…</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((card, i) => (
                <div key={card.id} style={{ animationDelay: `${i * 80}ms` }}>
                  <AnimalCardComponent
                    card={card}
                    compact
                    onClick={() => setSelectedCard(card)}
                  />
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-muted-foreground font-display">
                  {captures.length === 0 ? 'Aucune capture partagée' : 'Aucune espèce trouvée'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default FriendCollectionPage;
