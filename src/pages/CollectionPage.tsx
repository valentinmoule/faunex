import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Target, ChevronRight } from 'lucide-react';
import NearbyAnimalsSection from '@/components/NearbyAnimalsSection';
import AnimalCardComponent from '@/components/AnimalCardComponent';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'mythic'];

const CollectionPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  
  const [captures, setCaptures] = useState<AnimalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayName, setDisplayName] = useState('');

  // Fetch profile name & unread notifications
  useEffect(() => {
    if (!session?.user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('display_name, username').eq('user_id', session.user.id).single();
      if (data) setDisplayName(data.display_name || data.username || '');
    };
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };
    fetchProfile();
    fetchUnread();
    const channel = supabase
      .channel('notif-count-collection')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const fetchCaptures = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCaptures(data.map((c: any) => ({
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
          latitude: c.latitude,
          longitude: c.longitude,
        })));
      }
      setLoading(false);
    };
    fetchCaptures();
  }, [session]);

  // Auto-open capture from notification link
  useEffect(() => {
    const captureId = searchParams.get('capture');
    if (!captureId || captures.length === 0) return;
    const found = captures.find(c => c.id === captureId);
    if (found) {
      setSelectedCard(found);
      setSearchParams({}, { replace: true });
    } else {
      // Capture might not be in our own collection — fetch it directly
      const fetchCapture = async () => {
        const { data } = await supabase.from('captures').select('*').eq('id', captureId).single();
        if (data) {
          setSelectedCard({
            id: data.id, name: data.animal_name, scientificName: data.scientific_name || '',
            image: data.image_url, rarity: data.rarity as Rarity, category: data.category || '',
            description: data.description || '', habitat: data.habitat || '', diet: data.diet || '',
            conservation: data.conservation || '', funFact: data.fun_fact || '',
            discoveredAt: data.created_at, location: data.location || '',
          });
          setSearchParams({}, { replace: true });
        }
      };
      fetchCapture();
    }
  }, [captures, searchParams]);

  const filtered = captures.filter(c => {
    if (filter !== 'all' && c.rarity !== filter) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-display font-bold text-primary">Mon Faunex</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-display">{captures.length} espèces</span>
              <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-muted transition-colors">
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
      </header>

      {/* Rarity filter chips */}
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

      {/* Card grid */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        {/* Daily quests link card */}
        <button
          onClick={() => navigate('/quests')}
          className="w-full mb-4 flex items-center gap-3 p-3.5 rounded-2xl border border-amber/20 bg-amber/5 hover:bg-amber/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-amber/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-amber" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-display font-bold text-foreground">Quêtes du jour</h3>
            <p className="text-[10px] text-muted-foreground">Complète tes défis pour gagner de l'XP</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <NearbyAnimalsSection capturedNames={captures.map(c => c.name)} />
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
              <div className="text-center py-16 px-6">
                {captures.length === 0 ? (
                  <>
                    <p className="text-4xl mb-3">📷</p>
                    <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune capture encore</p>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                      Pars en exploration et photographie les animaux que tu croises ! Chaque espèce capturée rejoint ton Faunex.
                    </p>
                  </>
                ) : filter === 'common' ? (
                  <>
                    <p className="text-4xl mb-3">🐦</p>
                    <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune espèce commune</p>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                      Les espèces communes sont celles que l'on croise facilement au quotidien : moineaux, pigeons, écureuils… Ouvre l'œil lors de tes prochaines sorties !
                    </p>
                  </>
                ) : filter === 'rare' ? (
                  <>
                    <p className="text-4xl mb-3">🦊</p>
                    <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune espèce rare</p>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                      Les espèces rares sont des animaux dont les populations diminuent. Les observer dans la nature est un vrai privilège — leur conservation est importante.
                    </p>
                  </>
                ) : filter === 'epic' ? (
                  <>
                    <p className="text-4xl mb-3">🦅</p>
                    <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune espèce épique</p>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                      Les espèces épiques sont vulnérables ou en danger. Leur nombre décline sérieusement — chaque observation compte pour suivre leur état dans la nature.
                    </p>
                  </>
                ) : filter === 'mythic' ? (
                  <>
                    <p className="text-4xl mb-3">🐋</p>
                    <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune espèce mythique</p>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                      Les espèces mythiques sont en danger critique d'extinction. Il ne reste que très peu d'individus dans la nature — les capturer sur Faunex est un exploit.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-muted-foreground font-display text-sm">Aucune espèce trouvée</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default CollectionPage;
