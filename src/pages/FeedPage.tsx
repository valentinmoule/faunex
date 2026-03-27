import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Share2, Send, X } from 'lucide-react';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

const FeedPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<FeedCapture[]>([]);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; display_name: string | null } | null>(null);

  // Fetch user profile and unread notifications count
  useEffect(() => {
    if (!session?.user) return;
    const fetchData = async () => {
      const [{ count }, { data: profile }] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('read', false),
        supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ]);
      setUnreadCount(count || 0);
      setUserProfile(profile);
    };
    fetchData();

    const channel = supabase
      .channel('notif-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, () => {
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('read', false)
          .then(({ count }) => setUnreadCount(count || 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const fetchFeed = async () => {
      setLoading(true);
      const userId = session.user.id;

      const { data: followsData } = await supabase
        .from('explorer_follows')
        .select('following_id')
        .eq('follower_id', userId);

      const friendIds = (followsData || []).map(f => f.following_id);

      const allIds = [userId, ...friendIds];

      // Get private profile IDs to exclude
      const { data: privateProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('is_private', true)
        .in('user_id', allIds);

      const privateIds = new Set((privateProfiles || []).map(p => p.user_id));
      // Keep own captures + non-private followed users
      const visibleIds = allIds.filter(id => id === userId || !privateIds.has(id));

      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .eq('status', 'approved')
        .in('user_id', visibleIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const captureIds = data.map((c: any) => c.id);

        // Fetch profiles, user likes, and counts in parallel
        const [profilesRes, likesRes, likeCountsRes, commentCountsRes] = await Promise.all([
          userIds.length > 0
            ? supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', userIds)
            : { data: [] },
          captureIds.length > 0
            ? supabase.from('feed_likes').select('capture_id').eq('user_id', userId).in('capture_id', captureIds)
            : { data: [] },
          captureIds.length > 0
            ? supabase.from('feed_likes').select('capture_id').in('capture_id', captureIds)
            : { data: [] },
          captureIds.length > 0
            ? supabase.from('feed_comments').select('capture_id').in('capture_id', captureIds)
            : { data: [] },
        ]);

        const profileMap = new Map(
          ((profilesRes as any).data || []).map((p: any) => [p.user_id, p])
        );

        // User's liked posts
        const likedSet = new Set<string>(
          ((likesRes as any).data || []).map((l: any) => l.capture_id)
        );
        setLikedPosts(likedSet);

        // Like counts per capture
        const lCounts: Record<string, number> = {};
        ((likeCountsRes as any).data || []).forEach((l: any) => {
          lCounts[l.capture_id] = (lCounts[l.capture_id] || 0) + 1;
        });
        setLikeCounts(lCounts);

        // Comment counts per capture
        const cCounts: Record<string, number> = {};
        ((commentCountsRes as any).data || []).forEach((c: any) => {
          cCounts[c.capture_id] = (cCounts[c.capture_id] || 0) + 1;
        });
        setCommentCounts(cCounts);

        const postsWithProfiles = data.map((c: any) => ({
          ...c,
          profiles: profileMap.get(c.user_id) || null,
        }));
        setPosts(postsWithProfiles as any);
      }
      setLoading(false);
    };
    fetchFeed();
  }, [session]);

  const handleLike = useCallback(async (captureId: string) => {
    if (!session?.user) return;
    const userId = session.user.id;
    const isLiked = likedPosts.has(captureId);

    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(captureId);
      else next.add(captureId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [captureId]: (prev[captureId] || 0) + (isLiked ? -1 : 1),
    }));

    if (isLiked) {
      await supabase.from('feed_likes').delete().eq('user_id', userId).eq('capture_id', captureId);
    } else {
      await supabase.from('feed_likes').insert({ user_id: userId, capture_id: captureId });
    }
  }, [session, likedPosts]);

  const loadComments = useCallback(async (captureId: string) => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('feed_comments')
      .select('*')
      .eq('capture_id', captureId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      setComments(data.map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || undefined,
      })));
    } else {
      setComments([]);
    }
    setLoadingComments(false);
  }, []);

  const handleOpenComments = useCallback((captureId: string) => {
    if (openComments === captureId) {
      setOpenComments(null);
      setComments([]);
      return;
    }
    setOpenComments(captureId);
    loadComments(captureId);
  }, [openComments, loadComments]);

  const handleSubmitComment = useCallback(async (captureId: string) => {
    if (!session?.user || !newComment.trim()) return;
    setSubmittingComment(true);

    const { error } = await supabase.from('feed_comments').insert({
      user_id: session.user.id,
      capture_id: captureId,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      setCommentCounts(prev => ({
        ...prev,
        [captureId]: (prev[captureId] || 0) + 1,
      }));
      await loadComments(captureId);
    }
    setSubmittingComment(false);
  }, [session, newComment, loadComments]);

  // Auto-open capture from notification link
  useEffect(() => {
    const captureId = searchParams.get('capture');
    if (captureId && posts.length > 0) {
      const post = posts.find(p => p.id === captureId);
      if (post) {
        setSelectedCard(toAnimalCard(post));
        setSearchParams({}, { replace: true });
      }
    }
  }, [posts, searchParams]);


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
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-display font-bold text-primary">
                  {(userProfile?.display_name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">Chargement…</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-muted-foreground font-display">Aucune capture partagée</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Ajoute des explorateurs ou partage tes captures !</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map(post => {
              const profile = post.profiles;
              const userName = profile?.display_name || profile?.username || 'Anonyme';
              const avatarUrl = profile?.avatar_url;
              const isLiked = likedPosts.has(post.id);
              const likeCount = likeCounts[post.id] || 0;
              const commentCount = commentCounts[post.id] || 0;
              const isCommentsOpen = openComments === post.id;

              return (
                <article key={post.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-display font-bold text-primary overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        userName.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-display font-semibold text-foreground truncate">{userName}</span>
                        <span className="text-xs text-muted-foreground">a capturé</span>
                      </div>
                      <button
                        onClick={() => setSelectedCard(toAnimalCard(post))}
                        className="block w-full mt-2 group"
                      >
                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border">
                          <img src={post.image_url} alt={post.animal_name} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/60 to-transparent p-3 pt-8">
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-primary-foreground font-display font-bold text-base">{post.animal_name}</p>
                                <p className="text-primary-foreground/70 text-[11px] italic">{post.scientific_name}</p>
                              </div>
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">
                                {RARITY_LABELS[post.rarity as Rarity] || post.rarity}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground shrink-0 self-start mt-0.5">{timeAgo(post.created_at)}</span>
                  </div>

                  {post.caption && (
                    <p className="text-xs text-foreground/70 mt-1.5 ml-11 leading-relaxed">{post.caption}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 ml-11 mt-2">
                    <button onClick={() => handleLike(post.id)} className="flex items-center gap-1 group">
                      <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground group-hover:text-destructive'}`} />
                      {likeCount > 0 && <span className={`text-xs ${isLiked ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>{likeCount}</span>}
                    </button>
                    <button onClick={() => handleOpenComments(post.id)} className="flex items-center gap-1 group">
                      <MessageCircle className={`w-4 h-4 transition-colors ${isCommentsOpen ? 'text-primary fill-primary/20' : 'text-muted-foreground group-hover:text-primary'}`} />
                      {commentCount > 0 && <span className={`text-xs ${isCommentsOpen ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{commentCount}</span>}
                    </button>
                  </div>

                  {/* Comments section */}
                  {isCommentsOpen && (
                    <div className="ml-11 mt-2 space-y-2">
                      {loadingComments ? (
                        <p className="text-xs text-muted-foreground py-1">Chargement…</p>
                      ) : comments.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">Aucun commentaire — sois le premier !</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {comments.map(comment => (
                            <div key={comment.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-display font-bold text-primary shrink-0 overflow-hidden">
                                {comment.profile?.avatar_url ? (
                                  <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (comment.profile?.display_name || comment.profile?.username || '?').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[11px] font-display font-semibold text-foreground">
                                    {comment.profile?.display_name || comment.profile?.username || 'Anonyme'}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                                </div>
                                <p className="text-xs text-foreground/80 leading-snug">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment(post.id)}
                          placeholder="Commenter…"
                          className="flex-1 bg-muted rounded-full px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                        />
                        <button
                          onClick={() => handleSubmitComment(post.id)}
                          disabled={!newComment.trim() || submittingComment}
                          className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default FeedPage;
