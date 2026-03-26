import { useState, useEffect, useCallback } from 'react';
import { Drawer } from 'vaul';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { MapPin, Leaf, UtensilsCrossed, Shield, Sparkles, Heart, MessageCircle, Send, PawPrint, Bird, Fish, Bug, Turtle, Rabbit, Shell, Waves, type LucideIcon } from 'lucide-react';
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
  common: 'from-[hsl(210,5%,55%)] to-[hsl(210,5%,40%)]',
  rare: 'from-[hsl(210,70%,55%)] to-[hsl(210,70%,38%)]',
  epic: 'from-[hsl(270,70%,60%)] to-[hsl(270,70%,42%)]',
  mythic: 'from-[hsl(42,85%,55%)] to-[hsl(38,75%,40%)]',
};

const rarityBg: Record<Rarity, string> = {
  common: 'bg-rarity-common/15',
  rare: 'bg-rarity-rare/15',
  epic: 'bg-rarity-epic/15',
  mythic: 'bg-rarity-mythic/15',
};

const rarityText: Record<Rarity, string> = {
  common: 'text-rarity-common',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  mythic: 'text-rarity-mythic',
};
const getCategoryIcon = (category: string): LucideIcon => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return Bird;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish;
  if (cat.includes('insecte') || cat.includes('arachnide')) return Bug;
  if (cat.includes('reptile')) return Turtle;
  if (cat.includes('amphibien')) return Rabbit;
  if (cat.includes('crustacé') || cat.includes('mollusque')) return Shell;
  if (cat.includes('mammifère') && cat.includes('marin')) return Waves;
  if (cat.includes('mammifère')) return PawPrint;
  return PawPrint;
};


const CardDetailSheet = ({ card, open, onClose }: Props) => {
  const { session } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [imageFullscreen, setImageFullscreen] = useState(false);

  // Fetch likes & comments when card opens
  useEffect(() => {
    if (!card || !open || !session?.user) return;
    setShowComments(false);
    setNewComment('');
    setImageFullscreen(false);

    const fetchSocial = async () => {
      const [myLike, allLikes, commentsRes] = await Promise.all([
        supabase.from('feed_likes').select('id').eq('user_id', session.user.id).eq('capture_id', card.id).limit(1),
        supabase.from('feed_likes').select('id', { count: 'exact', head: true }).eq('capture_id', card.id),
        supabase.from('feed_comments').select('*').eq('capture_id', card.id).order('created_at', { ascending: true }),
      ]);

      setLiked(((myLike as any).data || []).length > 0);
      setLikeCount((allLikes as any).count || 0);

      if ((commentsRes as any).data && (commentsRes as any).data.length > 0) {
        const userIds = Array.from(new Set((commentsRes as any).data.map((c: any) => c.user_id))) as string[];
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
        const userIds = Array.from(new Set(data.map((c: any) => c.user_id))) as string[];
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
  const isEpic = card.rarity === 'epic';
  const isRare = card.rarity === 'rare';
  const isShiny = isEpic || isMythic;

  const detailAppearClass = isMythic
    ? 'animate-card-appear-mythic'
    : isEpic
    ? 'animate-card-appear-epic'
    : isRare
    ? 'animate-card-appear-rare'
    : '';

  return (
    <>
      <Drawer.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 h-[92vh] rounded-t-3xl border-0 outline-none overflow-hidden">
            {/* Handle + close: absolute over content */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-12 h-1.5 rounded-full bg-white/40" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center hover:bg-foreground/30 transition-colors"
            >
              <span className="text-white text-lg font-light leading-none">✕</span>
            </button>
            <div className="h-full overflow-y-auto">
          <div className={`relative overflow-hidden detail-hero-${card.rarity}`} style={{ zIndex: 0 }}>
            
            {/* Mythic: blurred aurora orbs + light leak */}
            {isMythic && (
              <>
                <div className="detail-mythic-orb-1 pointer-events-none" />
                <div className="detail-mythic-orb-2 pointer-events-none" />
                <div className="detail-mythic-orb-3 pointer-events-none" />
                <div className="detail-mythic-vignette pointer-events-none" />
                <div className="detail-mythic-leak" />
                <div className="detail-mythic-geo" />
              </>
            )}
            {isEpic && (
              <>
                <div className="detail-epic-orb-1 pointer-events-none" />
                <div className="detail-epic-orb-2 pointer-events-none" />
                <div className="detail-epic-orb-3 pointer-events-none" />
                <div className="detail-epic-vignette pointer-events-none" />
                <div className="detail-epic-leak" />
                <div className="detail-epic-geo" />
              </>
            )}
            {isRare && (
              <>
                <div className="detail-rare-orb-1 pointer-events-none" />
                <div className="detail-rare-orb-2 pointer-events-none" />
                <div className="detail-rare-vignette pointer-events-none" />
                <div className="detail-rare-leak" />
                <div className="detail-rare-geo" />
              </>
            )}

            <div className="relative z-10 pt-6 px-6 pb-0">
              <div
                className={`relative mx-auto max-w-[280px] aspect-square rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform ${detailAppearClass}`}
                style={{ boxShadow: isMythic ? '0 0 40px 8px hsla(42,100%,65%,0.3), 0 8px 32px rgba(0,0,0,0.4)' : isEpic ? '0 0 35px 6px hsla(270,80%,65%,0.25), 0 8px 32px rgba(0,0,0,0.4)' : isRare ? '0 0 25px 4px hsla(210,70%,60%,0.2), 0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.4)' }}
                role="button"
                tabIndex={0}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  setImageFullscreen(true);
                }}
              >
                <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                {/* Glass shimmer overlay on image */}
                {isMythic && <div className="detail-mythic-glass" />}
                {isEpic && <div className="detail-epic-glass" />}
                {isRare && <div className="detail-rare-glass" />}
              </div>
            </div>

            <div className="relative z-10 text-center px-6 pt-4 pb-14">
              <h2 className="text-2xl font-display font-bold text-white drop-shadow-lg">{card.name}</h2>
              <p className="text-white/60 text-sm italic font-body mt-0.5">{card.scientificName}</p>
            </div>
          </div>

          {/* Card Body */}
          <div className="relative -mt-8 bg-background rounded-t-3xl px-5 pb-10 pt-5 space-y-5">

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
              {(() => {
                const CatIcon = getCategoryIcon(card.category);
                return (
                  <span className="px-3 py-1 rounded-full text-[11px] font-display font-semibold bg-muted text-muted-foreground inline-flex items-center gap-1">
                    <CatIcon className="w-3 h-3" />
                    {card.category}
                  </span>
                );
              })()}
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed text-center max-w-sm mx-auto">{card.description}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard icon={<MapPin className="w-4 h-4" />} label="Habitat" value={card.habitat} color="text-primary" bg="bg-primary/8" />
              <StatCard icon={<UtensilsCrossed className="w-4 h-4" />} label="Alimentation" value={card.diet} color="text-amber" bg="bg-amber/8" />
              <StatCard icon={<Shield className="w-4 h-4" />} label="Conservation" value={card.conservation} color="text-sky" bg="bg-sky/8" />
              <StatCard icon={<Leaf className="w-4 h-4" />} label="Lieu" value={card.location || 'Non renseigné'} color="text-forest-light" bg="bg-forest-light/8"
                link={card.latitude && card.longitude ? `https://www.google.com/maps?q=${card.latitude},${card.longitude}` : undefined}
              />
            </div>

            {/* Fun Fact */}
            <div className={`relative overflow-hidden rounded-2xl border ${isMythic ? 'border-rarity-mythic/30 bg-rarity-mythic/5' : isEpic ? 'border-rarity-epic/30 bg-rarity-epic/5' : 'border-border bg-muted/30'}`}>
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isMythic ? 'bg-rarity-mythic/15' : 'bg-primary/15'}`}>
                    <Sparkles className={`w-4 h-4 ${isMythic ? 'text-rarity-mythic' : 'text-primary'}`} />
                  </div>
                  <p className={`text-xs font-display font-bold uppercase tracking-wider ${isMythic ? 'text-rarity-mythic' : 'text-muted-foreground'}`}>
                    Le saviez-vous ?
                  </p>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{card.funFact}</p>
              </div>
            </div>
          </div>
          </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Fullscreen image - outside Sheet to avoid portal conflicts */}
      {imageFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setImageFullscreen(false)}
        >
          <img
            src={card.image}
            alt={card.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setImageFullscreen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl font-light"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

const StatCard = ({ icon, label, value, color, bg, link }: {
  icon: React.ReactNode; label: string; value: string; color: string; bg: string; link?: string;
}) => {
  const content = (
    <div className={`${bg} rounded-xl p-3 space-y-1.5`}>
      <div className="flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xs leading-snug ${link ? 'text-primary underline' : 'text-foreground'}`}>{value}</p>
    </div>
  );
  if (link) return <a href={link} target="_blank" rel="noopener noreferrer">{content}</a>;
  return content;
};

export default CardDetailSheet;
