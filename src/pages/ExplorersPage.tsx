import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, UserCheck, X, Users, ChevronRight, Clock, Check as CheckIcon, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { followUser as followUserUtil } from '@/lib/followUtils';

interface SearchUser {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  species_count: number;
}

interface FollowProfile {
  user_id: string;
  profile?: SearchUser;
}

const ExplorersPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'search' | 'following' | 'followers' | 'requests'>('following');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<FollowProfile[]>([]);
  const [followers, setFollowers] = useState<FollowProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<FollowProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  const fetchFollows = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [{ data: followingData }, { data: followersData }, { data: pendingData }] = await Promise.all([
      supabase.from('explorer_follows').select('following_id').eq('follower_id', userId).eq('status', 'accepted'),
      supabase.from('explorer_follows').select('follower_id').eq('following_id', userId).eq('status', 'accepted'),
      supabase.from('explorer_follows').select('follower_id').eq('following_id', userId).eq('status', 'pending'),
    ]);

    // Also get my pending outgoing requests
    const { data: myPendingData } = await supabase.from('explorer_follows').select('following_id').eq('follower_id', userId).eq('status', 'pending');

    const followingUserIds = (followingData || []).map(f => f.following_id);
    const followerUserIds = (followersData || []).map(f => f.follower_id);
    const pendingUserIds = (pendingData || []).map(f => f.follower_id);
    const myPendingUserIds = (myPendingData || []).map(f => f.following_id);
    const allIds = [...new Set([...followingUserIds, ...followerUserIds, ...pendingUserIds, ...myPendingUserIds])];

    setFollowingIds(new Set(followingUserIds));
    setPendingIds(new Set(myPendingUserIds));

    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, level, species_count')
        .in('user_id', allIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setFollowing(followingUserIds.map(id => ({ user_id: id, profile: profileMap.get(id) as SearchUser | undefined })));
      setFollowers(followerUserIds.map(id => ({ user_id: id, profile: profileMap.get(id) as SearchUser | undefined })));
      setPendingRequests(pendingUserIds.map(id => ({ user_id: id, profile: profileMap.get(id) as SearchUser | undefined })));
    } else {
      setFollowing([]);
      setFollowers([]);
      setPendingRequests([]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchFollows(); }, [fetchFollows]);

  const doSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-users', {
        body: { query: searchQuery.trim() },
      });
      if (error) throw error;
      setSearchResults(data?.users || []);
    } catch {
      toast.error('Erreur de recherche');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(doSearch, 400);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleFollow = async (targetId: string) => {
    if (!userId) return;
    const result = await followUserUtil(userId, targetId);
    if (result.error === 'already_following') {
      toast.info('Déjà abonné');
      return;
    }
    if (result.error) {
      toast.error("Erreur lors de l'abonnement");
      return;
    }
    if (result.status === 'pending') {
      toast.success('Demande envoyée !');
      setPendingIds(prev => new Set(prev).add(targetId));
    } else {
      toast.success('Abonné !');
      setFollowingIds(prev => new Set(prev).add(targetId));
    }
    fetchFollows();
  };

  const acceptRequest = async (requesterId: string) => {
    await supabase.from('explorer_follows')
      .update({ status: 'accepted' })
      .eq('follower_id', requesterId)
      .eq('following_id', userId);
    toast.success('Demande acceptée !');
    fetchFollows();
  };

  const rejectRequest = async (requesterId: string) => {
    await supabase.from('explorer_follows')
      .delete()
      .eq('follower_id', requesterId)
      .eq('following_id', userId);
    toast.info('Demande refusée');
    fetchFollows();
  };

  const unfollowUser = async (targetId: string) => {
    if (!userId) return;
    await supabase.from('explorer_follows').delete()
      .eq('follower_id', userId)
      .eq('following_id', targetId);
    toast.info('Désabonné');
    setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
    fetchFollows();
  };

  const isFollowing = (uid: string) => followingIds.has(uid);
  const isPending = (uid: string) => pendingIds.has(uid);

  const UserRow = ({ user, action, onClick }: { user: SearchUser; action: React.ReactNode; onClick?: () => void }) => (
    <div
      className={`flex items-center gap-3 py-3 ${onClick ? 'cursor-pointer active:bg-muted/50 transition-colors rounded-lg -mx-2 px-2' : ''}`}
      onClick={onClick}
    >
      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary shrink-0 overflow-hidden">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          (user.display_name || user.username || '?').charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-semibold text-foreground truncate">{user.display_name || 'Sans nom'}</p>
        <p className="text-[11px] text-muted-foreground truncate">{user.username} · Niv. {user.level} · {user.species_count} espèces</p>
      </div>
      <div onClick={e => e.stopPropagation()}>
        {action}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">Explorateurs</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom ou pseudo…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setTab('search'); }}
              onFocus={() => setTab('search')}
              className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setTab('following'); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {tab !== 'search' && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="flex gap-2 pb-2 overflow-x-auto">
            <button
              onClick={() => setTab('following')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors whitespace-nowrap ${tab === 'following' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Abonnements ({following.length})
            </button>
            <button
              onClick={() => setTab('followers')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors whitespace-nowrap ${tab === 'followers' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Abonnés ({followers.length})
            </button>
            {pendingRequests.length > 0 && (
              <button
                onClick={() => setTab('requests')}
                className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors whitespace-nowrap relative ${tab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                Demandes ({pendingRequests.length})
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-2">
        {/* Search results */}
        {tab === 'search' && (
          <div className="divide-y divide-border">
            {searching && <p className="text-center py-8 text-muted-foreground text-sm font-display">Recherche…</p>}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm font-display">Aucun explorateur trouvé</p>
            )}
            {!searching && searchQuery.length < 2 && (
              <p className="text-center py-8 text-muted-foreground text-sm font-display">Tape au moins 2 caractères</p>
            )}
            {searchResults.filter(u => u.user_id !== userId).map(user => (
              <UserRow
                key={user.user_id}
                user={user}
                onClick={() => navigate(`/explorer/${user.user_id}/collection`)}
                action={
                  isFollowing(user.user_id) ? (
                    <button
                      onClick={() => unfollowUser(user.user_id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-display font-semibold"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Abonné
                    </button>
                  ) : isPending(user.user_id) ? (
                    <button
                      disabled
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-display font-semibold"
                    >
                      <Clock className="w-3.5 h-3.5" /> En attente
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFollow(user.user_id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> S'abonner
                    </button>
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Following list */}
        {tab === 'following' && (
          loading ? (
            <p className="text-center py-8 text-muted-foreground text-sm font-display">Chargement…</p>
          ) : following.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-display font-semibold text-sm mb-2">Aucun abonnement</p>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                Abonne-toi à des explorateurs pour découvrir leurs captures et suivre leurs aventures ! Utilise la barre de recherche ci-dessus.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {following.map(f => f.profile && (
                <UserRow
                  key={f.user_id}
                  user={f.profile}
                  onClick={() => navigate(`/explorer/${f.user_id}/collection`)}
                  action={<ChevronRight className="w-4 h-4 text-muted-foreground" />}
                />
              ))}
            </div>
          )
        )}

        {/* Followers list */}
        {tab === 'followers' && (
          loading ? (
            <p className="text-center py-8 text-muted-foreground text-sm font-display">Chargement…</p>
          ) : followers.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-display font-semibold text-sm mb-2">Aucun abonné</p>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                Personne ne s'est encore abonné à ton profil. Partage ton pseudo pour te faire connaître !
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {followers.map(f => f.profile && (
                <UserRow
                  key={f.user_id}
                  user={f.profile}
                  onClick={() => navigate(`/explorer/${f.user_id}/collection`)}
                  action={
                    isFollowing(f.user_id) ? (
                      <button
                        onClick={() => unfollowUser(f.user_id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-display font-semibold"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Abonné
                      </button>
                    ) : isPending(f.user_id) ? (
                      <button
                        disabled
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-display font-semibold"
                      >
                        <Clock className="w-3.5 h-3.5" /> En attente
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollow(f.user_id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> S'abonner
                      </button>
                    )
                  }
                />
              ))}
            </div>
          )
        )}

        {/* Pending requests */}
        {tab === 'requests' && (
          loading ? (
            <p className="text-center py-8 text-muted-foreground text-sm font-display">Chargement…</p>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune demande</p>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                Tu n'as aucune demande d'abonnement en attente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingRequests.map(f => f.profile && (
                <UserRow
                  key={f.user_id}
                  user={f.profile}
                  onClick={() => navigate(`/explorer/${f.user_id}/collection`)}
                  action={
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => acceptRequest(f.user_id)}
                        className="p-2 rounded-lg bg-primary text-primary-foreground"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => rejectRequest(f.user_id)}
                        className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-destructive"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
};

export default ExplorersPage;
