import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { avatarFallbackStyle } from '@/lib/avatarPalette';
import { notifyCaptureInteraction } from '@/lib/notifyCaptureInteraction';
import HolographicCard from '@/components/HolographicCard';
import RarityBadge from '@/components/RarityBadge';
import { normalizeRarity, type Rarity } from '@/data/mockData';

interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

interface Props {
  captureId: string;
  imageUrl: string;
  authorName?: string | null;
  animalName: string;
  scientificName?: string | null;
  rarity: Rarity;
  onClose: () => void;
}

/** Affichage plein écran d'une capture d'explorateur, avec like et commentaires comme dans le feed. */
const CaptureViewSheet = ({ captureId, imageUrl, authorName, animalName, scientificName, rarity, onClose }: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const uid = session?.user?.id;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [likesRes, myLikeRes, commentsRes] = await Promise.all([
        supabase.from('feed_likes').select('id', { count: 'exact', head: true }).eq('capture_id', captureId),
        uid ? supabase.from('feed_likes').select('id').eq('capture_id', captureId).eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('feed_comments').select('id', { count: 'exact', head: true }).eq('capture_id', captureId),
      ]);
      if (!alive) return;
      setLikeCount(likesRes.count ?? 0);
      setLiked(!!(myLikeRes as any).data);
      setCommentCount(commentsRes.count ?? 0);
    })();
    return () => { alive = false; };
  }, [captureId, uid]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const { data } = await supabase.from('feed_comments').select('*').eq('capture_id', captureId).order('created_at', { ascending: true });
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', ids)
      : { data: [] as any[] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    setComments(rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null })));
    setLoadingComments(false);
  }, [captureId]);

  const handleLike = async () => {
    if (!uid) return;
    const was = liked;
    setLiked(!was);
    setLikeCount((c) => c + (was ? -1 : 1));
    if (was) {
      await supabase.from('feed_likes').delete().eq('user_id', uid).eq('capture_id', captureId);
    } else {
      await supabase.from('feed_likes').insert({ user_id: uid, capture_id: captureId });
      notifyCaptureInteraction(captureId, uid, 'like');
    }
  };

  const handleOpenComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) void loadComments();
  };

  const handleSubmitComment = async () => {
    if (!uid || !newComment.trim() || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from('feed_comments').insert({ user_id: uid, capture_id: captureId, content: newComment.trim() });
    if (!error) {
      notifyCaptureInteraction(captureId, uid, 'comment', newComment.trim());
      setNewComment('');
      setCommentCount((c) => c + 1);
      await loadComments();
    }
    setSubmitting(false);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('social.common.now', { defaultValue: "à l'instant" });
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h`;
    return `${Math.floor(h / 24)} j`;
  };

  return createPortal(
    <div
      className="detail-fullscreen fixed inset-0 z-[10000] flex flex-col overflow-hidden bg-foreground"
      style={{ ['--photo-blur' as any]: '50px', ['--photo-scale' as any]: '2.25', ['--photo-veil' as any]: '0.38' } as React.CSSProperties}
    >
      <div aria-hidden className="detail-photo-backdrop" style={{ backgroundImage: `url("${imageUrl}")` }} />
      <div aria-hidden className="detail-photo-veil bg-foreground" />

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center p-4" onClick={() => !commentsOpen && onClose()}>
          <HolographicCard
            rarity={rarity}
            containInteraction
            className="holo-fullscreen-photo relative rounded-[1.5rem] pointer-events-auto touch-none max-h-full"
            style={{ ['--holo-radius' as any]: '1.5rem' }}
            overlay={<div className="holo-fullscreen-rarity"><RarityBadge rarity={rarity} plain /></div>}
          >
            <div className={`relative w-full h-full rounded-[1.5rem] overflow-hidden shadow-2xl holo-frame holo-frame--fullscreen holo-frame--${normalizeRarity(rarity).replace(/_/g, '-')}`}>
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/30">
                <img
                  src={imageUrl}
                  alt={animalName}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
                <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-5 pr-6 pt-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <h3 className="text-white font-display font-bold text-2xl leading-tight drop-shadow-lg">{animalName}</h3>
                  {scientificName && (
                    <p className="text-white/90 text-sm italic font-body leading-tight mt-1 drop-shadow">{scientificName}</p>
                  )}
                  {authorName && (
                    <p className="text-white/70 text-xs font-body leading-tight mt-1 drop-shadow">{authorName}</p>
                  )}
                </div>
              </div>
            </div>
          </HolographicCard>
        </div>

        {/* Actions + commentaires, comme dans le feed */}
        <div className="relative z-10 bg-background rounded-t-3xl px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
          <div className="flex items-center gap-5">
            <button type="button" onClick={handleLike} className="flex items-center gap-1.5 group">
              <Heart className={`w-5 h-5 transition-all ${liked ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground group-hover:text-destructive'}`} />
              {likeCount > 0 && <span className={`text-sm ${liked ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>{likeCount}</span>}
            </button>
            <button type="button" onClick={handleOpenComments} className="flex items-center gap-1.5 group">
              <MessageCircle className={`w-5 h-5 transition-colors ${commentsOpen ? 'text-primary fill-primary/20' : 'text-muted-foreground group-hover:text-primary'}`} />
              {commentCount > 0 && <span className={`text-sm ${commentsOpen ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{commentCount}</span>}
            </button>
          </div>

          {commentsOpen && (
            <div className="space-y-2">
              {loadingComments ? <p className="text-xs text-muted-foreground py-1">{t('social.common.loading')}</p> :
               comments.length === 0 ? <p className="text-xs text-muted-foreground py-1">{t('social.explorers.noComments', { defaultValue: 'Aucun commentaire — sois le premier !' })}</p> : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div
                        style={avatarFallbackStyle(comment.profile?.display_name || comment.profile?.username)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-display font-bold shrink-0 overflow-hidden"
                      >
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
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                  placeholder={t('social.explorers.commentPlaceholder')}
                  className="flex-1 bg-muted rounded-full px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                />
                <button type="button" onClick={handleSubmitComment} disabled={!newComment.trim() || submitting} className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"><Send className="w-3 h-3" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-[60] w-16 h-16 -m-1 p-1 rounded-full flex items-center justify-center text-white/90 active:text-white transition-colors"
        style={{ touchAction: 'manipulation' }}
        aria-label={t('common.close', { defaultValue: 'Fermer' })}
      >
        <span className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-2xl font-light leading-none pointer-events-none">✕</span>
      </button>
    </div>,
    (document.querySelector('[role="dialog"]') as HTMLElement) || document.body,
  );
};

export default CaptureViewSheet;
