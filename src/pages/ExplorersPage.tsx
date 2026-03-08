import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, UserCheck, Clock, X, Users, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SearchUser {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  species_count: number;
}

interface FriendRelation {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile?: SearchUser;
}

const ExplorersPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'search' | 'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<FriendRelation[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendRelation[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendRelation[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  const fetchRelations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('explorer_friends')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const accepted: FriendRelation[] = [];
    const received: FriendRelation[] = [];
    const sent: FriendRelation[] = [];
    const fIds = new Set<string>();
    const pIds = new Set<string>();

    for (const rel of data || []) {
      const otherId = rel.requester_id === userId ? rel.addressee_id : rel.requester_id;
      if (rel.status === 'accepted') {
        fIds.add(otherId);
        accepted.push({ ...rel });
      } else if (rel.status === 'pending') {
        pIds.add(otherId);
        if (rel.addressee_id === userId) received.push({ ...rel });
        else sent.push({ ...rel });
      }
    }

    // Fetch profiles for all related users
    const allOtherIds = [...new Set([
      ...accepted.map(r => r.requester_id === userId ? r.addressee_id : r.requester_id),
      ...received.map(r => r.requester_id),
      ...sent.map(r => r.addressee_id),
    ])];

    if (allOtherIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, level, species_count')
        .in('user_id', allOtherIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      accepted.forEach(r => {
        const oid = r.requester_id === userId ? r.addressee_id : r.requester_id;
        r.profile = profileMap.get(oid) as SearchUser | undefined;
      });
      received.forEach(r => { r.profile = profileMap.get(r.requester_id) as SearchUser | undefined; });
      sent.forEach(r => { r.profile = profileMap.get(r.addressee_id) as SearchUser | undefined; });
    }

    setFriends(accepted);
    setPendingReceived(received);
    setPendingSent(sent);
    setFriendIds(fIds);
    setPendingIds(pIds);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchRelations(); }, [fetchRelations]);

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

  const sendRequest = async (targetId: string) => {
    if (!userId) return;
    const { error } = await supabase.from('explorer_friends').insert({
      requester_id: userId,
      addressee_id: targetId,
    });
    if (error) {
      if (error.code === '23505') toast.info('Demande déjà envoyée');
      else toast.error('Erreur lors de l\'envoi');
      return;
    }
    toast.success('Demande envoyée !');
    setPendingIds(prev => new Set(prev).add(targetId));
    fetchRelations();
  };

  const respondRequest = async (relationId: string, accept: boolean) => {
    if (accept) {
      await supabase.from('explorer_friends').update({ status: 'accepted' }).eq('id', relationId);
      toast.success('Ami explorateur ajouté !');
    } else {
      await supabase.from('explorer_friends').delete().eq('id', relationId);
      toast.info('Demande refusée');
    }
    fetchRelations();
  };

  const removeFriend = async (relationId: string) => {
    await supabase.from('explorer_friends').delete().eq('id', relationId);
    toast.info('Ami retiré');
    fetchRelations();
  };

  const getStatus = (uid: string): 'friend' | 'pending' | 'none' => {
    if (friendIds.has(uid)) return 'friend';
    if (pendingIds.has(uid)) return 'pending';
    return 'none';
  };

  const UserRow = ({ user, action }: { user: SearchUser; action: React.ReactNode }) => (
    <div className="flex items-center gap-3 py-3">
      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary shrink-0">
        {(user.display_name || user.username || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-semibold text-foreground truncate">{user.display_name || 'Sans nom'}</p>
        <p className="text-[11px] text-muted-foreground truncate">{user.username} · Niv. {user.level} · {user.species_count} espèces</p>
      </div>
      {action}
    </div>
  );

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">Explorateurs</h1>
          {/* Search bar */}
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
              <button onClick={() => { setSearchQuery(''); setTab('friends'); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      {tab !== 'search' && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => setTab('friends')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${tab === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Amis ({friends.length})
            </button>
            <button
              onClick={() => setTab('requests')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors relative ${tab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Demandes
              {pendingReceived.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-primary-foreground flex items-center justify-center">
                  {pendingReceived.length}
                </span>
              )}
            </button>
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
            {searchResults.map(user => {
              const status = getStatus(user.user_id);
              return (
                <UserRow
                  key={user.user_id}
                  user={user}
                  action={
                    status === 'friend' ? (
                      <span className="flex items-center gap-1 text-xs text-primary font-display"><UserCheck className="w-4 h-4" /> Ami</span>
                    ) : status === 'pending' ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-display"><Clock className="w-4 h-4" /> En attente</span>
                    ) : (
                      <button onClick={() => sendRequest(user.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold">
                        <UserPlus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        )}

        {/* Friends list */}
        {tab === 'friends' && (
          loading ? (
            <p className="text-center py-8 text-muted-foreground text-sm font-display">Chargement…</p>
          ) : friends.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-display text-sm">Aucun ami explorateur</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Recherche des explorateurs pour les ajouter !</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {friends.map(rel => rel.profile && (
                <UserRow
                  key={rel.id}
                  user={rel.profile}
                  action={
                    <button onClick={() => removeFriend(rel.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors font-display">
                      Retirer
                    </button>
                  }
                />
              ))}
            </div>
          )
        )}

        {/* Pending requests */}
        {tab === 'requests' && (
          <div className="space-y-4">
            {pendingReceived.length > 0 && (
              <section>
                <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reçues</h3>
                <div className="divide-y divide-border">
                  {pendingReceived.map(rel => rel.profile && (
                    <UserRow
                      key={rel.id}
                      user={rel.profile}
                      action={
                        <div className="flex gap-2">
                          <button onClick={() => respondRequest(rel.id, true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold">
                            Accepter
                          </button>
                          <button onClick={() => respondRequest(rel.id, false)} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-display font-semibold">
                            Refuser
                          </button>
                        </div>
                      }
                    />
                  ))}
                </div>
              </section>
            )}
            {pendingSent.length > 0 && (
              <section>
                <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">Envoyées</h3>
                <div className="divide-y divide-border">
                  {pendingSent.map(rel => rel.profile && (
                    <UserRow
                      key={rel.id}
                      user={rel.profile}
                      action={
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-display"><Clock className="w-3.5 h-3.5" /> En attente</span>
                      }
                    />
                  ))}
                </div>
              </section>
            )}
            {pendingReceived.length === 0 && pendingSent.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm font-display">Aucune demande en attente</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default ExplorersPage;
