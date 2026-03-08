import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { MapPin, Leaf, UtensilsCrossed, Shield, Sparkles, Star, Heart, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  card: AnimalCard | null;
  open: boolean;
  onClose: () => void;
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

const rarityGradients: Record<Rarity, string> = {
  common: 'from-[hsl(150,30%,50%)] to-[hsl(150,30%,35%)]',
  uncommon: 'from-[hsl(200,70%,55%)] to-[hsl(200,70%,38%)]',
  rare: 'from-[hsl(270,60%,60%)] to-[hsl(270,60%,42%)]',
  epic: 'from-[hsl(42,80%,55%)] to-[hsl(38,75%,40%)]',
  legendary: 'from-[hsl(15,85%,55%)] to-[hsl(15,85%,38%)]',
  mythic: 'from-[hsl(340,75%,55%)] to-[hsl(270,60%,45%)]',
};

const rarityBg: Record<Rarity, string> = {
  common: 'bg-rarity-common/15',
  uncommon: 'bg-rarity-uncommon/15',
  rare: 'bg-rarity-rare/15',
  epic: 'bg-rarity-epic/15',
  legendary: 'bg-rarity-legendary/15',
  mythic: 'bg-rarity-mythic/15',
};

const rarityText: Record<Rarity, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
  mythic: 'text-rarity-mythic',
};

const rarityStars: Record<Rarity, number> = {
  common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6,
};

const CardDetailSheet = ({ card, open, onClose }: Props) => {
  const { session } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Fetch likes & comments when card opens
  useEffect(() => {
    if (!card || !open || !session?.user) return;
    setShowComments(false);
    setNewComment('');

    const fetchSocial = async () => {
      const [myLike, allLikes, commentsRes] = await Promise.all([
        supabase.from('feed_likes').select('id').eq('user_id', session.user.id).eq('capture_id', card.id).limit(1),
        supabase.from('feed_likes').select('id', { count: 'exact', head: true }).eq('capture_id', card.id),
        supabase.from('feed_comments').select('*').eq('capture_id', card.id).order('created_at', { ascending: true }),
      ]);

      setLiked(((myLike as any).data || []).length > 0);
      setLikeCount((allLikes as any).count || 0);

      if ((commentsRes as any).data && (commentsRes as any).data.length > 0) {
        const userIds = [...new Set((commentsRes as any).data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setComments((commentsRes as any).data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
      } else {
        setComments([]);
      }
    };
    fetchSocial();
  }, [card, open, session]);

  const handleLike = useCallback(async () => {
    if (!session?.user || !card) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => prev + (wasLiked ? -1 : 1));

    if (wasLiked) {
      await supabase.from('feed_likes').delete().eq('user_id', session.user.id).eq('capture_id', card.id);
    } else {
      await supabase.from('feed_likes').insert({ user_id: session.user.id, capture_id: card.id });
    }
  }, [session, card, liked]);

  const handleSubmitComment = useCallback(async () => {
    if (!session?.user || !card || !newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('feed_comments').insert({
      user_id: session.user.id,
      capture_id: card.id,
      content: newComment.trim(),
    });
    if (!error) {
      setNewComment('');
      // Refetch comments
      const { data } = await supabase.from('feed_comments').select('*').eq('capture_id', card.id).order('created_at', { ascending: true });
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setComments(data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
      }
    }
    setSubmitting(false);
  }, [session, card, newComment]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  if (!card) return null;

  const isMythic = card.rarity === 'mythic';
  const isLegendary = card.rarity === 'legendary';
  const isShiny = isLegendary || isMythic;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl overflow-y-auto p-0 bg-background border-0">
        {/* Hero Image Section */}
        <div className={`relative overflow-hidden ${isMythic ? 'mythic-shiny' : ''}`}>
          <div className={`absolute inset-0 z-0 bg-gradient-to-b ${rarityGradients[card.rarity]} opacity-90`} />

          <div className="relative z-10 pt-6 px-6 pb-0">
            <div className="relative mx-auto max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
              {isMythic && <div className="mythic-image-overlay" />}
              {isMythic && (
                <div className="mythic-sparkles">
                  <span /><span /><span /><span /><span /><span />
                </div>
              )}
              {isShiny && !isMythic && (
                <div className="absolute inset-0 holographic-card card-shimmer pointer-events-none" style={{ backgroundImage: 'var(--gradient-holographic)', backgroundSize: '200% 200%', opacity: 0.25 }} />
              )}
            </div>
          </div>

          <div className="relative z-10 text-center px-6 pt-4 pb-5">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              {Array.from({ length: rarityStars[card.rarity] }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 fill-current ${isMythic ? 'text-white/90' : isLegendary ? 'text-amber-light' : 'text-white/70'}`} />
              ))}
            </div>
            <h2 className="text-2xl font-display font-bold text-white drop-shadow-lg">{card.name}</h2>
            <p className="text-white/60 text-sm italic font-body mt-0.5">{card.scientificName}</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="relative -mt-3 bg-background rounded-t-3xl px-5 pb-10 pt-5 space-y-5">

          {/* Like & Comment bar */}
          <div className="flex items-center justify-center gap-6">
            <button onClick={handleLike} className="flex items-center gap-2 group">
              <Heart className={`w-6 h-6 transition-all ${liked ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground group-hover:text-destructive'}`} />
              <span className={`text-sm font-display font-semibold ${liked ? 'text-destructive' : 'text-muted-foreground'}`}>{likeCount}</span>
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 group">
              <MessageCircle className={`w-6 h-6 transition-colors ${showComments ? 'text-primary fill-primary/20' : 'text-muted-foreground group-hover:text-primary'}`} />
              <span className={`text-sm font-display font-semibold ${showComments ? 'text-primary' : 'text-muted-foreground'}`}>{comments.length}</span>
            </button>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun commentaire — sois le premier !</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-display font-bold text-primary shrink-0 overflow-hidden">
                        {comment.profile?.avatar_url ? (
                          <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (comment.profile?.display_name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-display font-semibold text-foreground">
                            {comment.profile?.display_name || comment.profile?.username || 'Anonyme'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-snug">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                  placeholder="Ajouter un commentaire…"
                  className="flex-1 bg-background rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Rarity + Category chips */}
          <div className="flex items-center justify-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-display font-bold uppercase tracking-wider ${rarityBg[card.rarity]} ${rarityText[card.rarity]}`}>
              {RARITY_LABELS[card.rarity]}
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-display font-semibold bg-muted text-muted-foreground">
              {card.category}
            </span>
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed text-center max-w-sm mx-auto">{card.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard icon={<MapPin className="w-4 h-4" />} label="Habitat" value={card.habitat} color="text-primary" bg="bg-primary/8" />
            <StatCard icon={<UtensilsCrossed className="w-4 h-4" />} label="Alimentation" value={card.diet} color="text-amber" bg="bg-amber/8" />
            <StatCard icon={<Shield className="w-4 h-4" />} label="Conservation" value={card.conservation} color="text-sky" bg="bg-sky/8" />
            <StatCard icon={<Leaf className="w-4 h-4" />} label="Lieu" value={card.location} color="text-forest-light" bg="bg-forest-light/8" />
          </div>

          {/* Fun Fact */}
          <div className={`relative overflow-hidden rounded-2xl border ${isMythic ? 'border-rarity-mythic/30 bg-rarity-mythic/5' : isLegendary ? 'border-rarity-legendary/30 bg-rarity-legendary/5' : 'border-amber/20 bg-amber/5'}`}>
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isMythic ? 'bg-rarity-mythic/15' : 'bg-amber/15'}`}>
                  <Sparkles className={`w-4 h-4 ${isMythic ? 'text-rarity-mythic' : 'text-amber'}`} />
                </div>
                <p className={`text-xs font-display font-bold uppercase tracking-wider ${isMythic ? 'text-rarity-mythic' : 'text-amber-dark'}`}>
                  Le saviez-vous ?
                </p>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{card.funFact}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const StatCard = ({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: string; color: string; bg: string;
}) => (
  <div className={`${bg} rounded-xl p-3 space-y-1.5`}>
    <div className="flex items-center gap-1.5">
      <span className={color}>{icon}</span>
      <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
    <p className="text-xs text-foreground leading-snug">{value}</p>
  </div>
);

export default CardDetailSheet;
