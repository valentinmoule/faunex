import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

interface FeedCapture {
  id: string;
  image_url: string;
  animal_name: string;
  scientific_name: string;
  category: string;
  description: string;
  habitat: string;
  diet: string;
  conservation: string;
  fun_fact: string;
  rarity: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const FeedPage = () => {
  const [posts, setPosts] = useState<FeedCapture[]>([]);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .eq('shared', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        // Fetch profiles for unique user_ids
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(
          (profilesData || []).map((p: any) => [p.user_id, p])
        );
        
        const postsWithProfiles = data.map((c: any) => ({
          ...c,
          profiles: profileMap.get(c.user_id) || null,
        }));
        setPosts(postsWithProfiles as any);
      }

      if (!error && data) {
        setPosts(data as any);
      }
      setLoading(false);
    };
    fetchFeed();
  }, []);

  const toAnimalCard = (post: FeedCapture): AnimalCard => ({
    id: post.id,
    name: post.animal_name,
    scientificName: post.scientific_name || '',
    image: post.image_url,
    rarity: post.rarity as Rarity,
    category: post.category || '',
    description: post.description || '',
    habitat: post.habitat || '',
    diet: post.diet || '',
    conservation: post.conservation || '',
    funFact: post.fun_fact || '',
    discoveredAt: post.created_at,
    location: '',
  });

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-primary">Faunex</h1>
          <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">Chargement…</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-muted-foreground font-display">Aucune capture partagée pour le moment</p>
          </div>
        ) : (
          posts.map(post => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
            const userName = profile?.display_name || profile?.username || 'Anonyme';
            const isShiny = post.rarity === 'legendary' || post.rarity === 'mythic';

            return (
              <article key={post.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-card">
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary">
                    {userName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-primary/10 text-primary">
                    {RARITY_LABELS[post.rarity as Rarity] || post.rarity}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedCard(toAnimalCard(post))}
                  className="relative w-full aspect-square overflow-hidden"
                >
                  <img src={post.image_url} alt={post.animal_name} className="w-full h-full object-cover" />
                  {isShiny && <div className="absolute inset-0 holographic-card card-shimmer pointer-events-none" style={{ backgroundImage: 'var(--gradient-holographic)', backgroundSize: '200% 200%', opacity: 0.2 }} />}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/60 to-transparent p-4 pt-12">
                    <p className="text-primary-foreground font-display font-bold text-lg">{post.animal_name}</p>
                    <p className="text-primary-foreground/70 text-xs italic">{post.scientific_name}</p>
                  </div>
                </button>

                {post.caption && (
                  <div className="px-4 pt-3">
                    <p className="text-sm text-foreground leading-relaxed">{post.caption}</p>
                  </div>
                )}

                <div className="flex items-center gap-5 px-4 py-3">
                  <button className="flex items-center gap-1.5 group">
                    <Heart className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                    <span className="text-sm text-muted-foreground">{post.likes_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 group">
                    <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm text-muted-foreground">{post.comments_count}</span>
                  </button>
                  <button className="ml-auto group">
                    <Share2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default FeedPage;
