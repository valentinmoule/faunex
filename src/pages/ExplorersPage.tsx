import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { notifyCaptureInteraction } from '@/lib/notifyCaptureInteraction';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Bell, Heart, MessageCircle, Send, UserPlus, UserCheck, X, Users, ChevronRight, Clock, Check as CheckIcon, XCircle, ArrowLeft } from 'lucide-react';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { thumbUrl } from '@/lib/imageUrl';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { followUser as followUserUtil } from '@/lib/followUtils';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { useTranslation } from 'react-i18next';
import RarityBadge from '@/components/RarityBadge';
import { rarityBorderColor } from '@/lib/bestiary';
import { hapticTap } from '@/lib/haptics';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';
import CaptureMilestoneCard, { isMilestoneRank } from '@/components/CaptureMilestoneCard';


/** Socle coloré + ombre rareté (effet "rare à légendaire" en grille). */
const tileDepthClass: Record<string, string> = {
  rare: 'game-tile--rare game-tile--rare-shadow',
  very_rare: 'game-tile--very-rare game-tile--rare-shadow',
  ultra_rare: 'game-tile--silver game-tile--rare-shadow',
  illustration_rare: 'game-tile--gold game-tile--rare-shadow',
  special_rare: 'game-tile--gold game-tile--rare-shadow',
  hyper_rare: 'game-tile--hyper game-tile--rare-shadow',
};

// ── Feed types ──
interface FeedCapture {
  id: string;
  image_url: string;
  subject_bbox?: { x: number; y: number; w: number; h: number } | null;
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

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

// ── Search types ──
interface SearchUser {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  total_captures: number;
}

interface FollowProfile {
  user_id: string;
  profile?: SearchUser;
}

// Comptes techniques masqués de la liste des explorateurs (review App Store)
const HIDDEN_USER_IDS = ['f7910e92-39a6-4703-b31d-bf1e245e2a4e', 'ac0df155-7422-4073-bfc1-14e2a71960bc'];

const ExplorersPage = () => {
  const { t } = useTranslation();
  const { speciesName } = useSpeciesName();

  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // View mode: 'feed' (default) or 'search' (search/followers/following)
  const [view, setView] = useState<'feed' | 'search'>('feed');

  // ── Feed state ──
  const FEED_PAGE_SIZE = 25;
  const [posts, setPosts] = useState<FeedCapture[]>([]);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedOffset, setFeedOffset] = useState(0);
  const [feedFollowingIds, setFeedFollowingIds] = useState<string[] | null>(null);
  const feedSentinelRef = useRef<HTMLDivElement | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [milestoneRanks, setMilestoneRanks] = useState<Record<string, number>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);


  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; display_name: string | null } | null>(null);


  // ── Search state ──
  const [searchTab, setSearchTab] = useState<'search' | 'following' | 'followers' | 'requests'>('following');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<FollowProfile[]>([]);
  const [followers, setFollowers] = useState<FollowProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<FollowProfile[]>([]);
  const [followsLoading, setFollowsLoading] = useState(true);

  const userId = session?.user?.id;

  // ── Premium status ──
  const feedUserIds = useMemo(() => [...new Set(posts.map(p => p.user_id))], [posts]);
  const feedPremiumIds = usePremiumUsers(feedUserIds);

  const searchUserIds = useMemo(() => {
    const ids = new Set<string>();
    searchResults.forEach(u => ids.add(u.user_id));
    following.forEach(f => { if (f.profile) ids.add(f.profile.user_id); });
    followers.forEach(f => { if (f.profile) ids.add(f.profile.user_id); });
    pendingRequests.forEach(f => { if (f.profile) ids.add(f.profile.user_id); });
    return [...ids];
  }, [searchResults, following, followers, pendingRequests]);

  const searchPremiumIds = usePremiumUsers(searchUserIds);

  // ── Header data ──
  useEffect(() => {
    if (!session?.user) return;
    const fetchData = async () => {
      const [{ count }, { data: profile }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('read', false),
        supabase.from('profiles').select('avatar_url, display_name').eq('user_id', session.user.id).maybeSingle(),
      ]);
      setUnreadCount(count || 0);
      setUserProfile(profile);
    };
    fetchData();

    const channel = supabase
      .channel('notif-count-explorers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => {
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('read', false).then(({ count }) => setUnreadCount(count || 0));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // ── Feed data (paginated, infinite scroll) ──
  const fetchFeedPage = useCallback(async (followingIds: string[], offset: number, replace: boolean) => {
    if (!session?.user) return;
    const uid = session.user.id;
    if (followingIds.length === 0) {
      setPosts([]); setLikedPosts(new Set()); setLikeCounts({}); setCommentCounts({});
      setFeedHasMore(false); setFeedLoading(false); setFeedLoadingMore(false);
      return;
    }
    if (replace) setFeedLoading(true); else setFeedLoadingMore(true);

    const from = offset;
    const to = offset + FEED_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .eq('status', 'approved')
      .eq('shared', true)
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      const uids = [...new Set(data.map((c: any) => c.user_id))];
      const captureIds = data.map((c: any) => c.id);

      const [profilesRes, likesRes, likeCountsRes, commentCountsRes] = await Promise.all([
        uids.length > 0 ? supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', uids) : { data: [] },
        captureIds.length > 0 ? supabase.from('feed_likes').select('capture_id').eq('user_id', uid).in('capture_id', captureIds) : { data: [] },
        captureIds.length > 0 ? supabase.from('feed_likes').select('capture_id').in('capture_id', captureIds) : { data: [] },
        captureIds.length > 0 ? supabase.from('feed_comments').select('capture_id').in('capture_id', captureIds) : { data: [] },
      ]);

      const profileMap = new Map(((profilesRes as any).data || []).map((p: any) => [p.user_id, p]));
      const newLiked = new Set<string>(((likesRes as any).data || []).map((l: any) => l.capture_id as string));
      setLikedPosts(prev => replace ? newLiked : new Set<string>([...Array.from(prev), ...Array.from(newLiked)]));


      setLikeCounts(prev => {
        const next = replace ? {} : { ...prev };
        ((likeCountsRes as any).data || []).forEach((l: any) => { next[l.capture_id] = (next[l.capture_id] || 0) + 1; });
        return next;
      });
      setCommentCounts(prev => {
        const next = replace ? {} : { ...prev };
        ((commentCountsRes as any).data || []).forEach((c: any) => { next[c.capture_id] = (next[c.capture_id] || 0) + 1; });
        return next;
      });

      const newPosts = (data.map((c: any) => ({ ...c, profiles: profileMap.get(c.user_id) || null })) as FeedCapture[]);
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts]);
      setFeedOffset(offset + data.length);
      if (data.length < FEED_PAGE_SIZE) setFeedHasMore(false);

      // Jalons de collection (1re, 10e, 25e, 50e, 100e capture de l'explorateur)
      if (captureIds.length > 0) {
        supabase
          .rpc('capture_milestones', { capture_ids: captureIds })
          .then(({ data: ranks }) => {
            if (!ranks) return;
            setMilestoneRanks(prev => {
              const next = replace ? {} : { ...prev };
              (ranks as any[]).forEach(r => { next[r.capture_id] = r.capture_rank; });
              return next;
            });
          });
      } else if (replace) {
        setMilestoneRanks({});
      }
    }

    setFeedLoading(false);
    setFeedLoadingMore(false);
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const init = async () => {
      const { data: followsData } = await supabase
        .from('explorer_follows')
        .select('following_id')
        .eq('follower_id', session.user.id)
        .eq('status', 'accepted');
      const ids = (followsData || []).map(f => f.following_id);
      setFeedFollowingIds(ids);
      setFeedOffset(0);
      setFeedHasMore(true);
      fetchFeedPage(ids, 0, true);
    };
    init();
  }, [session, fetchFeedPage]);

  // Infinite scroll sentinel for feed
  useEffect(() => {
    if (view !== 'feed' || feedLoading || !feedHasMore || feedFollowingIds === null) return;
    const el = feedSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !feedLoadingMore) {
        fetchFeedPage(feedFollowingIds, feedOffset, false);
      }
    }, { rootMargin: '300px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [view, feedLoading, feedHasMore, feedFollowingIds, feedOffset, feedLoadingMore, fetchFeedPage]);

  // ── Follows data ──
  const fetchFollows = useCallback(async () => {
    if (!userId) return;

    setFollowsLoading(true);
    const [{ data: followingData }, { data: followersData }, { data: pendingData }] = await Promise.all([
      supabase.from('explorer_follows').select('following_id').eq('follower_id', userId).eq('status', 'accepted'),
      supabase.from('explorer_follows').select('follower_id').eq('following_id', userId).eq('status', 'accepted'),
      supabase.from('explorer_follows').select('follower_id').eq('following_id', userId).eq('status', 'pending'),
    ]);
    const { data: myPendingData } = await supabase.from('explorer_follows').select('following_id').eq('follower_id', userId).eq('status', 'pending');

    const followingUserIds = (followingData || []).map(f => f.following_id);
    const followerUserIds = (followersData || []).map(f => f.follower_id);
    const pendingUserIds = (pendingData || []).map(f => f.follower_id);
    const myPendingUserIds = (myPendingData || []).map(f => f.following_id);
    const allIds = [...new Set([...followingUserIds, ...followerUserIds, ...pendingUserIds, ...myPendingUserIds])];

    setFollowingIds(new Set(followingUserIds));
    setPendingIds(new Set(myPendingUserIds));

    if (allIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url, level, total_captures').in('user_id', allIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setFollowing(followingUserIds.map(id => ({ user_id: id, profile: profileMap.get(id) as SearchUser | undefined })));
      setFollowers(followerUserIds.map(id => ({ user_id: id, profile: profileMap.get(id) as SearchUser | undefined })));
      setPendingRequests(pendingUserIds.map(id => ({ user_id: id, profile: profileMap.get(id) as SearchUser | undefined })));
    } else {
      setFollowing([]); setFollowers([]); setPendingRequests([]);
    }
    setFollowsLoading(false);
  }, [userId]);

  useEffect(() => { fetchFollows(); }, [fetchFollows]);

  // ── Search (min 3 caractères) ──
  const doSearch = async () => {
    if (searchQuery.trim().length < 3) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-users', { body: { query: searchQuery.trim() } });
      if (error) throw error;
      setSearchResults(((data?.users || []) as SearchUser[]).filter(u => !HIDDEN_USER_IDS.includes(u.user_id)));
    } catch { toast.error('Erreur de recherche'); } finally { setSearching(false); }
  };

  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      const timer = setTimeout(doSearch, 400);
      return () => clearTimeout(timer);
    } else { setSearchResults([]); }
  }, [searchQuery]);


  // ── Follow actions ──
  const handleFollow = async (targetId: string) => {
    if (!userId) return;
    const result = await followUserUtil(userId, targetId);
    if (result.error === 'already_following') { toast.info('Déjà abonné'); return; }
    if (result.error) { toast.error("Erreur lors de l'abonnement"); return; }
    if (result.status === 'pending') { toast.success('Demande envoyée !'); setPendingIds(prev => new Set(prev).add(targetId)); }
    else { toast.success('Abonné !'); setFollowingIds(prev => new Set(prev).add(targetId)); }
    fetchFollows();
  };

  const acceptRequest = async (requesterId: string) => {
    await supabase.from('explorer_follows').update({ status: 'accepted' }).eq('follower_id', requesterId).eq('following_id', userId);
    toast.success('Demande acceptée !'); fetchFollows();
  };

  const rejectRequest = async (requesterId: string) => {
    await supabase.from('explorer_follows').delete().eq('follower_id', requesterId).eq('following_id', userId);
    toast.info('Demande refusée'); fetchFollows();
  };

  const unfollowUser = async (targetId: string) => {
    if (!userId) return;
    await supabase.from('explorer_follows').delete().eq('follower_id', userId).eq('following_id', targetId);
    toast.info('Désabonné');
    setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
    fetchFollows();
  };

  const isFollowing = (uid: string) => followingIds.has(uid);
  const isPending = (uid: string) => pendingIds.has(uid);

  // ── Feed helpers ──
  const handleLike = useCallback(async (captureId: string) => {
    if (!session?.user) return;
    const uid = session.user.id;
    const liked = likedPosts.has(captureId);
    setLikedPosts(prev => { const n = new Set(prev); liked ? n.delete(captureId) : n.add(captureId); return n; });
    setLikeCounts(prev => ({ ...prev, [captureId]: (prev[captureId] || 0) + (liked ? -1 : 1) }));
    if (liked) await supabase.from('feed_likes').delete().eq('user_id', uid).eq('capture_id', captureId);
    else {
      await supabase.from('feed_likes').insert({ user_id: uid, capture_id: captureId });
      notifyCaptureInteraction(captureId, uid, 'like');
    }
  }, [session, likedPosts]);

  const loadComments = useCallback(async (captureId: string) => {
    setLoadingComments(true);
    const { data } = await supabase.from('feed_comments').select('*').eq('capture_id', captureId).order('created_at', { ascending: true });
    if (data && data.length > 0) {
      const uids = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', uids);
      const pm = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setComments(data.map((c: any) => ({ ...c, profile: pm.get(c.user_id) || undefined })));
    } else { setComments([]); }
    setLoadingComments(false);
  }, []);

  const handleOpenComments = useCallback((captureId: string) => {
    if (openComments === captureId) { setOpenComments(null); setComments([]); return; }
    setOpenComments(captureId); loadComments(captureId);
  }, [openComments, loadComments]);

  const handleSubmitComment = useCallback(async (captureId: string) => {
    if (!session?.user || !newComment.trim()) return;
    setSubmittingComment(true);
    const { error } = await supabase.from('feed_comments').insert({ user_id: session.user.id, capture_id: captureId, content: newComment.trim() });
    if (!error) { notifyCaptureInteraction(captureId, session.user.id, 'comment', newComment.trim()); setNewComment(''); setCommentCounts(prev => ({ ...prev, [captureId]: (prev[captureId] || 0) + 1 })); await loadComments(captureId); }
    setSubmittingComment(false);
  }, [session, newComment, loadComments]);

  // Auto-open capture from notification link
  useEffect(() => {
    const captureId = searchParams.get('capture');
    if (captureId && posts.length > 0) {
      const post = posts.find(p => p.id === captureId);
      if (post) { setSelectedCard(toAnimalCard(post)); setSearchParams({}, { replace: true }); }
    }
  }, [posts, searchParams]);

  const toAnimalCard = (post: FeedCapture): AnimalCard => ({
    id: post.id, name: post.animal_name, scientificName: post.scientific_name || '', image: post.image_url,
    subjectBox: post.subject_bbox,
    rarity: post.rarity as Rarity, category: post.category || '', description: post.description || '',
    habitat: post.habitat || '', diet: post.diet || '', conservation: post.conservation || '',
    funFact: post.fun_fact || '', discoveredAt: post.created_at, location: '',
  });

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t('social.common.timeAgo_min', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('social.common.timeAgo_hour', { count: hours });
    const days = Math.floor(hours / 24);
    return t('social.common.timeAgo_day', { count: days });
  };

  // ── UserRow component ──

  const UserRow = ({ user, action, onClick, isPremium }: { user: SearchUser; action: React.ReactNode; onClick?: () => void; isPremium?: boolean }) => (
    <div className={`flex items-center gap-3 py-3 ${onClick ? 'cursor-pointer active:bg-muted/50 transition-colors rounded-lg -mx-2 px-2' : ''}`} onClick={onClick}>
      <PremiumAvatar
        avatarUrl={user.avatar_url}
        name={user.display_name || user.username}
        size="lg"
        isPremium={isPremium}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-semibold text-foreground truncate">{user.display_name || t('social.common.noName')}</p>
        <p className="text-[11px] text-muted-foreground truncate">{t('social.common.level', { level: user.level })} · {t('social.common.speciesCount', { count: user.total_captures })}</p>
      </div>
      <div onClick={e => e.stopPropagation()}>{action}</div>
    </div>
  );

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════

  if (view === 'search') {
    return (
      <main className="min-h-screen bg-background pb-24">
        <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => { setView('feed'); setSearchQuery(''); setSearchTab('following'); }} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-xl font-display font-bold text-foreground">Explorateurs</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par nom ou pseudo…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchTab('search'); }}
                onFocus={() => setSearchTab('search')}
                className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchTab('following'); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </PageHeader>

        {searchTab !== 'search' && (
          <div className="max-w-lg mx-auto px-4 pt-3">
            <div className="flex gap-2 pb-2 overflow-x-auto">
              <button onClick={() => setSearchTab('following')} className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors whitespace-nowrap ${searchTab === 'following' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Abonnements ({following.length})
              </button>
              <button onClick={() => setSearchTab('followers')} className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors whitespace-nowrap ${searchTab === 'followers' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Abonnés ({followers.length})
              </button>
              {pendingRequests.length > 0 && (
                <button onClick={() => setSearchTab('requests')} className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-colors whitespace-nowrap relative ${searchTab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  Demandes ({pendingRequests.length})
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{pendingRequests.length}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto px-4 pt-2">
          {/* Résultats de recherche (min. 3 lettres) */}
          {searchTab === 'search' && (() => {
            const query = searchQuery.trim();
            const isSearching = query.length >= 3;
            const list = searchResults.filter(u => u.user_id !== userId);
            const renderAction = (user: SearchUser) =>
              isFollowing(user.user_id) ? (
                <button onClick={() => unfollowUser(user.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-display font-semibold"><UserCheck className="w-3.5 h-3.5" /> Abonné</button>
              ) : isPending(user.user_id) ? (
                <button disabled className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-display font-semibold"><Clock className="w-3.5 h-3.5" /> En attente</button>
              ) : (
                <button onClick={() => handleFollow(user.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold"><UserPlus className="w-3.5 h-3.5" /> S'abonner</button>
              );
            if (!isSearching) {
              return (
                <div className="text-center py-16 px-6">
                  <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-display font-semibold text-sm mb-2">Rechercher un explorateur</p>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                    Saisis au moins 3 lettres d'un nom ou d'un pseudo pour lancer la recherche.
                  </p>
                </div>
              );
            }
            return (
              <div className="divide-y divide-border">
                {searching && <p className="text-center py-8 text-muted-foreground text-sm font-display">Recherche…</p>}
                {!searching && list.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm font-display">Aucun explorateur trouvé</p>}
                {list.map(user => (
                  <UserRow key={user.user_id} user={user} onClick={() => navigate(`/explorer/${user.user_id}/collection`)} action={renderAction(user)} isPremium={searchPremiumIds.has(user.user_id)} />
                ))}
              </div>
            );
          })()}


          {/* Following */}
          {searchTab === 'following' && (
            followsLoading ? <p className="text-center py-8 text-muted-foreground text-sm font-display">{t('social.common.loading')}</p> :
            following.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-display font-semibold text-sm mb-2">Aucun abonnement</p>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">Utilise la barre de recherche pour trouver des explorateurs !</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {following.map(f => f.profile && <UserRow key={f.user_id} user={f.profile} onClick={() => navigate(`/explorer/${f.user_id}/collection`)} action={<ChevronRight className="w-4 h-4 text-muted-foreground" />} isPremium={searchPremiumIds.has(f.user_id)} />)}
              </div>
            )
          )}

          {/* Followers */}
          {searchTab === 'followers' && (
            followsLoading ? <p className="text-center py-8 text-muted-foreground text-sm font-display">{t('social.common.loading')}</p> :
            followers.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-display font-semibold text-sm mb-2">Aucun abonné</p>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">Partage ton pseudo pour te faire connaître !</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {followers.map(f => f.profile && <UserRow key={f.user_id} user={f.profile} onClick={() => navigate(`/explorer/${f.user_id}/collection`)} action={
                  isFollowing(f.user_id) ? (
                    <button onClick={() => unfollowUser(f.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-display font-semibold"><UserCheck className="w-3.5 h-3.5" /> Abonné</button>
                  ) : isPending(f.user_id) ? (
                    <button disabled className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-display font-semibold"><Clock className="w-3.5 h-3.5" /> En attente</button>
                  ) : (
                    <button onClick={() => handleFollow(f.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold"><UserPlus className="w-3.5 h-3.5" /> S'abonner</button>
                  )
                } isPremium={searchPremiumIds.has(f.user_id)} />)}
              </div>
            )
          )}

          {/* Pending requests */}
          {searchTab === 'requests' && (
            followsLoading ? <p className="text-center py-8 text-muted-foreground text-sm font-display">{t('social.common.loading')}</p> :
            pendingRequests.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune demande</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingRequests.map(f => f.profile && <UserRow key={f.user_id} user={f.profile} onClick={() => navigate(`/explorer/${f.user_id}/collection`)} action={
                  <div className="flex gap-1.5">
                    <button onClick={() => acceptRequest(f.user_id)} className="p-2 rounded-lg bg-primary text-primary-foreground"><CheckIcon className="w-4 h-4" /></button>
                    <button onClick={() => rejectRequest(f.user_id)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-destructive"><XCircle className="w-4 h-4" /></button>
                  </div>
                } isPremium={searchPremiumIds.has(f.user_id)} />)}
              </div>
            )
          )}
        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════
  // FEED VIEW (default)
  // ══════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-primary">Explorateurs</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('search')} className="p-2 rounded-full hover:bg-muted transition-colors relative">
              <Search className="w-5 h-5 text-foreground" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
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
      </PageHeader>

      <div className="max-w-lg mx-auto">
        {feedLoading ? (
          <div className="text-center py-16"><p className="text-muted-foreground font-display">{t('social.common.loading')}</p></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-muted-foreground font-display">Aucune capture partagée</p>
            <p className="text-muted-foreground text-xs mt-1">Ajoute des explorateurs ou partage tes captures !</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map(post => {
              const profile = post.profiles;
              const userName = profile?.display_name || profile?.username || t('social.common.anonymous');
              const avatarUrl = profile?.avatar_url;
              const isLiked = likedPosts.has(post.id);
              const likeCount = likeCounts[post.id] || 0;
              const commentCount = commentCounts[post.id] || 0;
              const isCommentsOpen = openComments === post.id;
              const milestone = milestoneRanks[post.id];


              return (
                <article key={post.id} className="py-3">
                  <div className="flex items-center gap-3 px-4">
                    <button onClick={() => navigate(`/explorer/${post.user_id}/collection`)}>
                      <PremiumAvatar
                        avatarUrl={avatarUrl}
                        name={userName}
                        size="md"
                        isPremium={feedPremiumIds.has(post.user_id)}
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <button onClick={() => navigate(`/explorer/${post.user_id}/collection`)} className="text-sm font-display font-semibold text-foreground truncate hover:underline">
                          {userName}
                        </button>
                        <span className="text-xs text-muted-foreground">a capturé</span>
                        <span className="text-[11px] text-muted-foreground">· {timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {isMilestoneRank(milestone) && (
                    <div className="px-4 mt-2">
                      <CaptureMilestoneCard rank={milestone} />
                    </div>
                  )}

                  <div className="px-4 mt-2">
                    <button

                      onClick={() => { hapticTap(); setSelectedCard(toAnimalCard(post)); }}
                      className={`game-tile relative block w-full aspect-[4/5] rounded-2xl border-2 overflow-hidden text-left active:scale-[0.99] transition-transform ${
                        rarityBorderColor[post.rarity as Rarity] || 'border-border'
                      } ${tileDepthClass[post.rarity] || ''} bg-card`}
                    >
                      <img
                        src={thumbUrl(post.image_url, 700)}
                        alt={speciesName(post.animal_name)}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute top-2 right-2">
                        <RarityBadge rarity={post.rarity as Rarity} showLabel />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10">
                        <p className="text-sm font-display font-bold text-white truncate leading-tight">
                          {speciesName(post.animal_name)}
                        </p>
                        {post.scientific_name && (
                          <p className="text-[10px] font-body italic text-white/80 truncate">
                            {post.scientific_name}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>

                  {post.caption && <p className="text-xs text-foreground/70 mt-1.5 px-4 leading-relaxed">{post.caption}</p>}

                  <div className="flex items-center gap-5 px-4 mt-3.5">
                    <button onClick={() => handleLike(post.id)} className="flex items-center gap-1.5 group">
                      <Heart className={`w-5 h-5 transition-all ${isLiked ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground group-hover:text-destructive'}`} />
                      {likeCount > 0 && <span className={`text-sm ${isLiked ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>{likeCount}</span>}
                    </button>
                    <button onClick={() => handleOpenComments(post.id)} className="flex items-center gap-1.5 group">
                      <MessageCircle className={`w-5 h-5 transition-colors ${isCommentsOpen ? 'text-primary fill-primary/20' : 'text-muted-foreground group-hover:text-primary'}`} />
                      {commentCount > 0 && <span className={`text-sm ${isCommentsOpen ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{commentCount}</span>}
                    </button>
                  </div>

                  {isCommentsOpen && (
                    <div className="px-4 mt-2 space-y-2">
                      {loadingComments ? <p className="text-xs text-muted-foreground py-1">{t('social.common.loading')}</p> :
                       comments.length === 0 ? <p className="text-xs text-muted-foreground py-1">Aucun commentaire — sois le premier !</p> : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {comments.map(comment => (
                            <div key={comment.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-display font-bold text-primary shrink-0 overflow-hidden">
                                {comment.profile?.avatar_url ? <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : (comment.profile?.display_name || comment.profile?.username || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[11px] font-display font-semibold text-foreground">{comment.profile?.display_name || comment.profile?.username || t('social.common.anonymous')}</span>
                                  <span className="text-[9px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                                </div>
                                <p className="text-xs text-foreground/80 leading-snug">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmitComment(post.id)} placeholder={t('social.explorers.commentPlaceholder')} className="flex-1 bg-muted rounded-full px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
                        <button onClick={() => handleSubmitComment(post.id)} disabled={!newComment.trim() || submittingComment} className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"><Send className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {feedLoadingMore && <p className="text-center py-6 text-muted-foreground text-sm font-display">{t('social.common.loading')}</p>}
            {!feedHasMore && posts.length > 0 && <p className="text-center py-6 text-muted-foreground text-xs font-display">Tu es à jour ✨</p>}
            {feedHasMore && !feedLoadingMore && <div ref={feedSentinelRef} className="h-8" />}
          </div>
        )}
      </div>


      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default ExplorersPage;
