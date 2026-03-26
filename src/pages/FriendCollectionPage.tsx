import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserMinus, Users, UserPlus, UserCheck, Clock, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import AnimalCardComponent from '@/components/AnimalCardComponent';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'mythic'];

interface FriendProfile {
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
  const [activeTab, setActiveTab] = useState<'collection' | 'friends'>('collection');
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
  const [friendRelationId, setFriendRelationId] = useState<string | null>(null);

  // Friend-of-friend state
  const [theirFriends, setTheirFriends] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [myFriendIds, setMyFriendIds] = useState<Set<string>>(new Set());
  const [myPendingIds, setMyPendingIds] = useState<Set<string>>(new Set());
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const myId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);

      const profilePromise = supabase.from('profiles').select('display_name, username, level, xp, xp_to_next, avatar_url').eq('user_id', userId).maybeSingle();
      const capturesPromise = supabase.from('captures').select('*').eq('user_id', userId).eq('status', 'approved').order('created_at', { ascending: false });

      const [profileRes, capturesRes] = await Promise.all([profilePromise, capturesPromise]);
      setProfileName(profileRes.data?.display_name || profileRes.data?.username || 'Explorateur');
      setProfileLevel(profileRes.data?.level || 0);
      setProfileXp(profileRes.data?.xp || 0);
      setProfileXpToNext(profileRes.data?.xp_to_next || 1000);
      setProfileAvatar(profileRes.data?.avatar_url || null);

      // Check friend relation
      if (myId && myId !== userId) {
        const { data: friendData } = await supabase.from('explorer_friends').select('id').or(`and(requester_id.eq.${myId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${myId})`).eq('status', 'accepted').limit(1);
        if (friendData && friendData.length > 0) {
          setFriendRelationId(friendData[0].id);
        }
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
      setLoading(false);
    };

    fetchData();
  }, [userId, myId]);

  // Fetch this explorer's friends and my own relations
  const fetchTheirFriends = useCallback(async () => {
    if (!userId || !myId) return;
    setLoadingFriends(true);

    // Get their accepted friend relations
    const { data: theirRels } = await supabase
      .from('explorer_friends')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    // Get my relations
    const { data: myRels } = await supabase
      .from('explorer_friends')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);

    // Build my friend/pending sets
    const fIds = new Set<string>();
    const pIds = new Set<string>();
    (myRels || []).forEach(r => {
      const otherId = r.requester_id === myId ? r.addressee_id : r.requester_id;
      if (r.status === 'accepted') fIds.add(otherId);
      else if (r.status === 'pending') pIds.add(otherId);
    });
    setMyFriendIds(fIds);
    setMyPendingIds(pIds);

    // Extract their friend user IDs (excluding me and the viewed user)
    const theirFriendIds = (theirRels || [])
      .map(r => r.requester_id === userId ? r.addressee_id : r.requester_id)
      .filter(id => id !== myId);

    if (theirFriendIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, level, species_count')
        .in('user_id', theirFriendIds);
      setTheirFriends((profiles || []) as FriendProfile[]);
    } else {
      setTheirFriends([]);
    }

    setLoadingFriends(false);
  }, [userId, myId]);

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchTheirFriends();
    }
  }, [activeTab, fetchTheirFriends]);

  const filtered = captures.filter(c => {
    if (filter !== 'all' && c.rarity !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const removeFriend = async () => {
    if (!friendRelationId) return;
    await supabase.from('explorer_friends').delete().eq('id', friendRelationId);
    toast.info('Ami retiré');
    navigate(-1);
  };

  const sendRequest = async (targetId: string) => {
    if (!myId) return;
    setSendingRequest(targetId);
    const { error } = await supabase.from('explorer_friends').insert({
      requester_id: myId,
      addressee_id: targetId,
    });
    if (error) {
      if (error.code === '23505') toast.info('Demande déjà envoyée');
      else toast.error("Erreur lors de l'envoi");
    } else {
      toast.success('Demande envoyée !');
      setMyPendingIds(prev => new Set(prev).add(targetId));
      supabase.functions.invoke('notify-friend-request', {
        body: { requester_id: myId, addressee_id: targetId },
      }).catch(console.error);
    }
    setSendingRequest(null);
  };

  const getFriendStatus = (uid: string): 'me' | 'friend' | 'pending' | 'none' => {
    if (uid === myId) return 'me';
    if (myFriendIds.has(uid)) return 'friend';
    if (myPendingIds.has(uid)) return 'pending';
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
            {friendRelationId && (
              <button
                onClick={removeFriend}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display font-semibold text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <UserMinus className="w-3.5 h-3.5" />
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
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Amis
            </button>
          </div>

          {activeTab === 'collection' && (
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
          )}
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
              </>
            )}
          </div>
        </>
      )}

      {/* Friends tab */}
      {activeTab === 'friends' && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          {loadingFriends ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-display text-sm">Chargement…</p>
            </div>
          ) : theirFriends.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-display font-semibold text-sm mb-2">Aucun ami explorateur</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {profileName} n'a pas encore d'amis explorateurs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {theirFriends.map((friend, i) => {
                const status = getFriendStatus(friend.user_id);
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
                      ) : status === 'friend' ? (
                        <button
                          onClick={() => navigate(`/explorer/${friend.user_id}/collection`)}
                          className="flex items-center gap-1 text-xs text-primary font-display"
                        >
                          <UserCheck className="w-4 h-4" />
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : status === 'pending' ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-display">
                          <Clock className="w-3.5 h-3.5" /> En attente
                        </span>
                      ) : (
                        <button
                          onClick={() => sendRequest(friend.user_id)}
                          disabled={sendingRequest === friend.user_id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold active:scale-95 transition-transform"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Ajouter
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
