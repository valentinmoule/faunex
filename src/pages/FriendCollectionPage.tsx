import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, UserPlus, UserCheck, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import AnimalCardComponent from '@/components/AnimalCardComponent';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  total: number;
}

const BADGE_DEFS: BadgeDef[] = [
  { id: 'first_capture', name: 'Première capture', icon: '📸', description: 'Capturer ton premier animal', total: 1 },
  { id: 'explorer_10', name: 'Explorateur', icon: '🧭', description: 'Découvrir 10 espèces', total: 10 },
  { id: 'explorer_25', name: 'Naturaliste', icon: '🌿', description: 'Découvrir 25 espèces', total: 25 },
  { id: 'explorer_50', name: 'Expert faune', icon: '🔬', description: 'Découvrir 50 espèces', total: 50 },
  { id: 'birds_5', name: 'Ornithologue', icon: '🐦', description: 'Capturer 5 oiseaux', total: 5 },
  { id: 'mammals_5', name: 'Mammalogiste', icon: '🦊', description: 'Capturer 5 mammifères', total: 5 },
  { id: 'rare_1', name: 'Chasseur rare', icon: '💎', description: 'Trouver un animal rare ou mieux', total: 1 },
  { id: 'legendary_1', name: 'Légende vivante', icon: '⭐', description: 'Trouver un animal épique', total: 1 },
  { id: 'mythic_1', name: 'Mythique !', icon: '🔥', description: 'Trouver un animal mythique', total: 1 },
  { id: 'social_3', name: 'Sociable', icon: '🤝', description: 'Suivre 3 explorateurs', total: 3 },
  { id: 'level_5', name: 'Niveau 5', icon: '🏅', description: 'Atteindre le niveau 5', total: 5 },
];

interface BadgeProgress {
  badge: BadgeDef;
  progress: number;
  earned: boolean;
}

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'mythic'];

interface FollowProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  species_count: number;
}

const FriendCollectionPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'collection' | 'following'>('collection');
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [search, setSearch] = useState('');
  const [captures, setCaptures] = useState<AnimalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profileLevel, setProfileLevel] = useState(0);
  const [profileXp, setProfileXp] = useState(0);
  const [profileXpToNext, setProfileXpToNext] = useState(1000);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [amIFollowing, setAmIFollowing] = useState(false);
  const [badges, setBadges] = useState<BadgeProgress[]>([]);

  // Their follows state
  const [theirFollowing, setTheirFollowing] = useState<FollowProfile[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());

  const myId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);

      const profilePromise = supabase.from('profiles').select('display_name, username, level, xp, xp_to_next, avatar_url').eq('user_id', userId).maybeSingle();
      const capturesPromise = supabase.from('captures').select('*').eq('user_id', userId).eq('status', 'approved').order('created_at', { ascending: false });
      const followCountPromise = supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId);

      const [profileRes, capturesRes, followCountRes] = await Promise.all([profilePromise, capturesPromise, followCountPromise]);
      setProfileName(profileRes.data?.display_name || profileRes.data?.username || 'Explorateur');
      setProfileLevel(profileRes.data?.level || 0);
      setProfileXp(profileRes.data?.xp || 0);
      setProfileXpToNext(profileRes.data?.xp_to_next || 1000);
      setProfileAvatar(profileRes.data?.avatar_url || null);

      // Check if I follow this person
      if (myId && myId !== userId) {
        const { data: followData } = await supabase.from('explorer_follows')
          .select('id')
          .eq('follower_id', myId)
          .eq('following_id', userId)
          .limit(1);
        setAmIFollowing(!!followData && followData.length > 0);
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
          latitude: c.latitude,
          longitude: c.longitude,
        })));
      }

      // Compute badges
      const rawCaptures = capturesRes.data || [];
      const totalCaptures = rawCaptures.length;
      const birdCount = rawCaptures.filter((c: any) => c.category?.toLowerCase().includes('oiseau')).length;
      const mammalCount = rawCaptures.filter((c: any) => c.category?.toLowerCase().includes('mammif')).length;
      const hasRare = rawCaptures.some((c: any) => ['rare', 'epic', 'mythic'].includes(c.rarity));
      const hasLegendary = rawCaptures.some((c: any) => ['epic', 'mythic'].includes(c.rarity));
      const hasMythic = rawCaptures.some((c: any) => c.rarity === 'mythic');
      const level = profileRes.data?.level || 1;
      const followCount = followCountRes.count || 0;

      const progressMap: Record<string, number> = {
        first_capture: Math.min(totalCaptures, 1),
        explorer_10: Math.min(totalCaptures, 10),
        explorer_25: Math.min(totalCaptures, 25),
        explorer_50: Math.min(totalCaptures, 50),
        birds_5: Math.min(birdCount, 5),
        mammals_5: Math.min(mammalCount, 5),
        rare_1: hasRare ? 1 : 0,
        legendary_1: hasLegendary ? 1 : 0,
        mythic_1: hasMythic ? 1 : 0,
        social_3: Math.min(followCount, 3),
        level_5: Math.min(level, 5),
      };

      setBadges(BADGE_DEFS.map(b => ({
        badge: b,
        progress: progressMap[b.id] || 0,
        earned: (progressMap[b.id] || 0) >= b.total,
      })));

      setLoading(false);
    };

    fetchData();
  }, [userId, myId]);

  // Fetch this explorer's following list and my own follows
  const fetchTheirFollowing = useCallback(async () => {
    if (!userId || !myId) return;
    setLoadingFollowing(true);

    const [{ data: theirData }, { data: myData }] = await Promise.all([
      supabase.from('explorer_follows').select('following_id').eq('follower_id', userId),
      supabase.from('explorer_follows').select('following_id').eq('follower_id', myId),
    ]);

    setMyFollowingIds(new Set((myData || []).map(f => f.following_id)));

    const theirFollowingIds = (theirData || [])
      .map(f => f.following_id)
      .filter(id => id !== myId);

    if (theirFollowingIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, level, species_count')
        .in('user_id', theirFollowingIds);
      setTheirFollowing((profiles || []) as FollowProfile[]);
    } else {
      setTheirFollowing([]);
    }

    setLoadingFollowing(false);
  }, [userId, myId]);

  useEffect(() => {
    if (activeTab === 'following') {
      fetchTheirFollowing();
    }
  }, [activeTab, fetchTheirFollowing]);

  const filtered = captures.filter(c => {
    if (filter !== 'all' && c.rarity !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleFollow = async () => {
    if (!myId || !userId) return;
    if (amIFollowing) {
      await supabase.from('explorer_follows').delete().eq('follower_id', myId).eq('following_id', userId);
      setAmIFollowing(false);
      toast.info('Désabonné');
    } else {
      const { error } = await supabase.from('explorer_follows').insert({ follower_id: myId, following_id: userId });
      if (error) { toast.error("Erreur"); return; }
      setAmIFollowing(true);
      toast.success('Abonné !');
    }
  };

  const followFromList = async (targetId: string) => {
    if (!myId) return;
    const { error } = await supabase.from('explorer_follows').insert({ follower_id: myId, following_id: targetId });
    if (error) {
      if (error.code === '23505') toast.info('Déjà abonné');
      else toast.error("Erreur");
      return;
    }
    toast.success('Abonné !');
    setMyFollowingIds(prev => new Set(prev).add(targetId));
  };

  const unfollowFromList = async (targetId: string) => {
    if (!myId) return;
    await supabase.from('explorer_follows').delete().eq('follower_id', myId).eq('following_id', targetId);
    toast.info('Désabonné');
    setMyFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
  };

  const getFollowStatus = (uid: string): 'me' | 'following' | 'none' => {
    if (uid === myId) return 'me';
    if (myFollowingIds.has(uid)) return 'following';
    return 'none';
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="relative w-11 h-11 rounded-full border-2 border-primary/30 overflow-hidden shrink-0">
              {profileAvatar ? (
                <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary">
                  {profileName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-display font-bold text-foreground truncate">{profileName}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-display">Niv. {profileLevel}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground font-display">{profileXp}/{profileXpToNext} XP</span>
              </div>
              <Progress value={profileXpToNext > 0 ? (profileXp / profileXpToNext) * 100 : 0} className="h-1.5 mt-1 bg-muted/50 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-amber" />
            </div>
            {myId && myId !== userId && (
              <button
                onClick={toggleFollow}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-display font-semibold shrink-0 transition-colors ${
                  amIFollowing
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {amIFollowing ? <><UserCheck className="w-3.5 h-3.5" /> Abonné</> : <><UserPlus className="w-3.5 h-3.5" /> S'abonner</>}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('collection')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${activeTab === 'collection' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Collection ({captures.length})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'following' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Abonnements
            </button>
          </div>

        </div>
      </header>

      {/* Collection tab */}
      {activeTab === 'collection' && (
        <>
          <div className="max-w-lg mx-auto px-4 pt-3">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
              {rarityFilters.map((r) => {
                const isActive = filter === r;
                const colorClasses = r === 'all'
                  ? isActive ? 'bg-foreground text-background border-foreground shadow-md' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  : r === 'common'
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
                    onClick={() => setFilter(r)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-bold border transition-all duration-300 flex items-center gap-1 active:scale-95 ${colorClasses} ${isActive && r !== 'all' ? 'bestiary-filter-glow' : ''} ${r === 'mythic' ? 'mythic-filter-shimmer' : ''}`}
                  >
                    {r !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${dot} ${isActive ? 'animate-pulse' : ''}`} />}
                    {r === 'all' ? 'Tous' : RARITY_LABELS[r]}
                  </button>
                );
              })}
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
                  <div className="text-center py-16 px-6">
                    {filter !== 'all' && captures.length > 0 ? (
                      <>
                        <p className="text-4xl mb-3">
                          {filter === 'common' ? '🌿' : filter === 'rare' ? '💎' : filter === 'epic' ? '⚡' : '✨'}
                        </p>
                        <p className="text-foreground font-display font-semibold text-sm mb-2">
                          Aucune espèce {RARITY_LABELS[filter].toLowerCase()} capturée
                        </p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {filter === 'common'
                            ? 'Les espèces communes sont les plus fréquentes. Elles sont faciles à trouver et idéales pour débuter sa collection.'
                            : filter === 'rare'
                            ? 'Les espèces rares sont plus difficiles à croiser. Elles se cachent dans des habitats spécifiques et demandent de l\'exploration.'
                            : filter === 'epic'
                            ? 'Les espèces épiques sont exceptionnelles. Très peu d\'explorateurs parviennent à les capturer — un vrai trophée !'
                            : 'Les espèces mythiques sont légendaires. Extrêmement rares, elles représentent le graal de tout explorateur Faunex.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-4xl mb-3">🔍</p>
                        <p className="text-muted-foreground font-display">
                          {captures.length === 0 ? 'Aucune capture partagée' : 'Aucune espèce trouvée'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Earned badges at bottom */}
                {badges.filter(b => b.earned).length > 0 && (
                  <div className="mt-8 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-amber/15 border border-amber/25 flex items-center justify-center">
                        <Award className="w-4 h-4 text-amber" />
                      </div>
                      <h3 className="text-sm font-display font-black text-foreground">Badges débloqués</h3>
                      <span className="text-[10px] font-display font-semibold text-amber bg-amber/10 border border-amber/20 px-2 py-0.5 rounded-full">
                        🏆 {badges.filter(b => b.earned).length}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {badges.filter(b => b.earned).map(({ badge }, i) => (
                        <div
                          key={badge.id}
                          className="relative rounded-xl p-2.5 text-center bg-gradient-to-b from-amber/10 via-amber/5 to-card border border-amber/30 shadow-[0_0_12px_hsla(42,85%,55%,0.1)] game-card-appear"
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          <div className="mx-auto w-10 h-10 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center mb-1.5">
                            <span className="text-xl badge-icon-float">{badge.icon}</span>
                          </div>
                          <p className="text-[10px] font-display font-black leading-tight text-foreground">{badge.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Following tab */}
      {activeTab === 'following' && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          {loadingFollowing ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-display text-sm">Chargement…</p>
            </div>
          ) : theirFollowing.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-display font-semibold text-sm mb-2">Aucun abonnement</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {profileName} ne suit encore personne.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {theirFollowing.map((friend, i) => {
                const status = getFollowStatus(friend.user_id);
                return (
                  <div
                    key={friend.user_id}
                    className="flex items-center gap-3 py-3 quest-card-enter"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <button
                      onClick={() => navigate(`/explorer/${friend.user_id}/collection`)}
                      className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition-opacity"
                    >
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary shrink-0 overflow-hidden">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (friend.display_name || friend.username || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-display font-semibold text-foreground truncate">{friend.display_name || 'Sans nom'}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{friend.username} · Niv. {friend.level} · {friend.species_count} espèces</p>
                      </div>
                    </button>
                    <div className="shrink-0">
                      {status === 'me' ? (
                        <span className="text-[10px] text-muted-foreground font-display">Toi</span>
                      ) : status === 'following' ? (
                        <button
                          onClick={() => unfollowFromList(friend.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-display font-semibold"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Abonné
                        </button>
                      ) : (
                        <button
                          onClick={() => followFromList(friend.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold active:scale-95 transition-transform"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> S'abonner
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default FriendCollectionPage;
