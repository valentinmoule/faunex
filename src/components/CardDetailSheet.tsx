import { useState, useEffect, useCallback, useRef, type ComponentType } from 'react';
import { notifyCaptureInteraction } from '@/lib/notifyCaptureInteraction';
import { Drawer } from 'vaul';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { type AnimalCard, type Rarity, RARITY_LABELS } from '@/data/mockData';
import { MapPin, Leaf, UtensilsCrossed, Shield, Sparkles, Heart, MessageCircle, Send, PawPrint, Bird, Fish, Bug, Turtle, Shell, Waves, Lock, Camera, type LucideIcon } from 'lucide-react';
import { FrogIcon } from '@/components/icons/FrogIcon';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import HolographicCard from '@/components/HolographicCard';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface Props {
  card: AnimalCard | null;
  open: boolean;
  onClose: () => void;
  /** Called after the user deleted their own capture, so the parent list can drop it. */
  onDeleted?: (captureId: string) => void;
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
const getCategoryIcon = (category: string): ComponentType<{ className?: string; strokeWidth?: string | number }> => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return Bird;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish;
  if (cat.includes('insecte') || cat.includes('arachnide')) return Bug;
  if (cat.includes('reptile')) return Turtle;
  if (cat.includes('amphibien')) return FrogIcon;
  if (cat.includes('crustacé') || cat.includes('mollusque')) return Shell;
  if (cat.includes('mammifère') && cat.includes('marin')) return Waves;
  if (cat.includes('mammifère')) return PawPrint;
  return PawPrint;
};

const LockedField = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5">
    <div className="text-muted-foreground/60">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className="text-sm text-muted-foreground/50 italic truncate">À découvrir</p>
    </div>
    <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
  </div>
);


const CardDetailSheet = ({ card, open, onClose, onDeleted }: Props) => {
  const { session } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locQuery, setLocQuery] = useState('');
  const [locResults, setLocResults] = useState<{ nom: string; centre?: { coordinates: [number, number] } }[]>([]);
  const [locLoading, setLocLoading] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  // Pinch-to-zoom state for the fullscreen photo
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const zoomRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    initialPan: { x: 0, y: 0 },
    initialCenter: { x: 0, y: 0 },
    lastTouch: { x: 0, y: 0 },
    lastTapTime: 0,
    isPinching: false,
    isPanning: false,
  });
  const [zoomInteracting, setZoomInteracting] = useState(false);

  useEffect(() => {
    if (!imageFullscreen) setZoomInteracting(false);
  }, [imageFullscreen]);


  // Reset transient UI state when a new card opens
  useEffect(() => {
    if (!card || !open) return;
    setShowComments(false);
    setNewComment('');
    setImageFullscreen(false);
    setComments([]);
    setCommentCount(0);
    setLiked(false);
    setLikeCount(0);

    // Preload fullscreen image (usually already in browser cache from grid)
    if (card.image) {
      const img = new Image();
      img.decoding = 'async';
      img.src = card.image;
    }
  }, [card, open]);

  // Ownership check + personal note — only the author can edit or delete their capture
  useEffect(() => {
    setIsOwner(false);
    setConfirmDelete(false);
    setNote('');
    setNoteDraft('');
    setEditingNote(false);
    setEditingLocation(false);
    setLocQuery('');
    setLocResults([]);
    setLocation(card?.location ?? null);
    if (!card || !open || !session?.user) return;
    if (!card.image || card.id.startsWith('uncaptured-')) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('captures')
        .select('user_id, note, location')
        .eq('id', card.id)
        .maybeSingle();
      if (!cancelled && data) {
        setIsOwner((data as any).user_id === session.user.id);
        setNote((data as any).note || '');
        setNoteDraft((data as any).note || '');
        setLocation((data as any).location || null);
      }
    })();
    return () => { cancelled = true; };
  }, [card, open, session]);

  // Debounced French commune search (geo.api.gouv.fr) for editing the capture location
  useEffect(() => {
    if (!editingLocation) return;
    const q = locQuery.trim();
    if (q.length < 2) {
      setLocResults([]);
      return;
    }
    let cancelled = false;
    setLocLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,centre&boost=population&limit=10`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setLocResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setLocResults([]);
      } finally {
        if (!cancelled) setLocLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [locQuery, editingLocation]);

  const saveLocation = useCallback(async (nom: string | null, coords?: [number, number]) => {
    if (!card || savingLocation) return;
    setSavingLocation(true);
    const payload: Record<string, unknown> = { location: nom };
    if (coords) {
      payload.longitude = coords[0];
      payload.latitude = coords[1];
    } else if (nom === null) {
      payload.longitude = null;
      payload.latitude = null;
    }
    const { error } = await supabase.from('captures').update(payload).eq('id', card.id);
    setSavingLocation(false);
    if (error) {
      toast({ title: 'Localisation non enregistrée', description: 'Réessaie dans un instant.', variant: 'destructive' });
      return;
    }
    setLocation(nom);
    if (coords) {
      (card as any).latitude = coords[1];
      (card as any).longitude = coords[0];
    } else if (nom === null) {
      (card as any).latitude = null;
      (card as any).longitude = null;
    }
    (card as any).location = nom;
    setEditingLocation(false);
    setLocQuery('');
    setLocResults([]);
    toast({ title: nom ? 'Localisation mise à jour' : 'Localisation retirée' });
  }, [card, savingLocation]);

  const saveNote = useCallback(async () => {
    if (!card || savingNote) return;
    const clean = noteDraft.trim().slice(0, 500);
    setSavingNote(true);
    const { error } = await supabase.from('captures').update({ note: clean || null }).eq('id', card.id);
    setSavingNote(false);
    if (error) {
      toast({ title: 'Note non enregistrée', description: 'Réessaie dans un instant.', variant: 'destructive' });
      return;
    }
    setNote(clean);
    setNoteDraft(clean);
    setEditingNote(false);
    toast({ title: clean ? 'Note enregistrée' : 'Note supprimée' });
  }, [card, noteDraft, savingNote]);

  const handleDelete = useCallback(async () => {
    if (!card || deleting) return;
    setDeleting(true);
    const { error } = await supabase.from('captures').delete().eq('id', card.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Suppression impossible', description: 'Réessaie dans un instant.', variant: 'destructive' });
      return;
    }

    setConfirmDelete(false);
    toast({ title: 'Capture supprimée', description: 'Elle a été retirée de ton Faunex.' });
    onDeleted?.(card.id);
    onClose();
  }, [card, deleting, onDeleted, onClose]);




  // Reset pinch-zoom when entering/leaving fullscreen so the photo always starts at 1x.
  useEffect(() => {
    if (imageFullscreen) {
      setZoom({ scale: 1, x: 0, y: 0 });
      zoomRef.current.isPinching = false;
      zoomRef.current.isPanning = false;
      zoomRef.current.lastTapTime = 0;
    }
  }, [imageFullscreen]);

  // Lightweight likes fetch — runs in idle time, doesn't block paint
  useEffect(() => {
    if (!card || !open || !session?.user) return;
    let cancelled = false;
    const run = async () => {
      const [myLike, allLikes, commentsCount] = await Promise.all([
        supabase.from('feed_likes').select('id').eq('user_id', session.user.id).eq('capture_id', card.id).limit(1),
        supabase.from('feed_likes').select('id', { count: 'exact', head: true }).eq('capture_id', card.id),
        supabase.from('feed_comments').select('id', { count: 'exact', head: true }).eq('capture_id', card.id),
      ]);
      if (cancelled) return;
      setLiked(((myLike as any).data || []).length > 0);
      setLikeCount((allLikes as any).count || 0);
      setCommentCount((commentsCount as any).count || 0);
    };
    const idle = (window as any).requestIdleCallback?.(run) ?? setTimeout(run, 0);
    return () => {
      cancelled = true;
      (window as any).cancelIdleCallback?.(idle);
      clearTimeout(idle);
    };
  }, [card, open, session]);

  // Fetch full comments only when the comments panel is opened
  useEffect(() => {
    if (!card || !open || !showComments) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('feed_comments').select('*').eq('capture_id', card.id).order('created_at', { ascending: true });
      if (cancelled || !data) return;
      if (data.length === 0) { setComments([]); setCommentCount(0); return; }
      const userIds = Array.from(new Set(data.map((c: any) => c.user_id))) as string[];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      if (!cancelled) { setComments(data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) }))); setCommentCount(data.length); }
    })();
    return () => { cancelled = true; };
  }, [card, open, showComments]);

  const handleLike = useCallback(async () => {
    if (!session?.user || !card) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => prev + (wasLiked ? -1 : 1));

    if (wasLiked) {
      await supabase.from('feed_likes').delete().eq('user_id', session.user.id).eq('capture_id', card.id);
    } else {
      await supabase.from('feed_likes').insert({ user_id: session.user.id, capture_id: card.id });
      notifyCaptureInteraction(card.id, session.user.id, 'like');
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
      notifyCaptureInteraction(card.id, session.user.id, 'comment', newComment.trim());
      setNewComment('');
      // Refetch comments
      const { data } = await supabase.from('feed_comments').select('*').eq('capture_id', card.id).order('created_at', { ascending: true });
      if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map((c: any) => c.user_id))) as string[];
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setComments(data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
        setCommentCount(data.length);
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

  // Pinch-to-zoom helpers for the fullscreen photo
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };
  const getTouchCenter = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });
  const clampScale = (s: number) => Math.min(4, Math.max(1, s));
  const resetZoom = useCallback(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
  }, []);

  const openFullscreenImage = useCallback(() => {
    setImageFullscreen(true);
  }, []);

  const handleFullscreenTouchStart = useCallback((e: React.TouchEvent) => {
    if (!card?.image) return;
    setZoomInteracting(true);

    const now = Date.now();
    const z = zoomRef.current;

    // Double-tap detection (single quick tap)
    if (e.touches.length === 1) {
      if (now - z.lastTapTime < 300) {
        e.preventDefault();
        if (zoom.scale > 1.05) {
          resetZoom();
        } else {
          // Zoom to 2.5x centered on tap point
          const rect = e.currentTarget.getBoundingClientRect();
          const tapX = e.touches[0].clientX - rect.left - rect.width / 2;
          const tapY = e.touches[0].clientY - rect.top - rect.height / 2;
          setZoom({ scale: 2.5, x: -tapX * 0.6, y: -tapY * 0.6 });
        }
        z.lastTapTime = 0;
        return;
      }
      z.lastTapTime = now;
    }

    if (e.touches.length === 2) {
      z.isPinching = true;
      z.initialDistance = getTouchDistance(e.touches);
      z.initialScale = zoom.scale;
      z.initialCenter = getTouchCenter(e.touches);
    } else if (e.touches.length === 1 && zoom.scale > 1.05) {
      z.isPanning = true;
      z.initialPan = { x: zoom.x, y: zoom.y };
      z.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [card?.image, zoom.scale, zoom.x, zoom.y, resetZoom]);

  const handleFullscreenTouchMove = useCallback((e: React.TouchEvent) => {

    const z = zoomRef.current;
    if (e.touches.length === 2 && z.isPinching) {
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);
      const ratio = newDistance / z.initialDistance;
      const newScale = clampScale(z.initialScale * ratio);
      setZoom(prev => ({ ...prev, scale: newScale }));
    } else if (e.touches.length === 1 && z.isPanning && zoom.scale > 1.05) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - z.lastTouch.x;
      const dy = touch.clientY - z.lastTouch.y;
      z.lastTouch = { x: touch.clientX, y: touch.clientY };
      setZoom(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    }
  }, [zoom.scale]);

  const handleFullscreenTouchEnd = useCallback(() => {
    const z = zoomRef.current;
    z.isPinching = false;
    z.isPanning = false;
    setZoomInteracting(false);
    setZoom(prev => {
      if (prev.scale < 1.05) return { scale: 1, x: 0, y: 0 };
      return { ...prev, scale: clampScale(prev.scale) };
    });
  }, []);

  if (!card) return null;

  const isUncaptured = !card.image || card.id.startsWith('uncaptured-');
  const isMythic = !isUncaptured && card.rarity === 'mythic';
  const isEpic = !isUncaptured && card.rarity === 'epic';
  const isRare = !isUncaptured && card.rarity === 'rare';
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
          <Drawer.Overlay className="fixed inset-0 z-[1300] bg-black/80" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1300] h-[92vh] rounded-t-3xl border-0 outline-none overflow-hidden">
            {/* Handle + close: absolute over content */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1301] w-12 h-1.5 rounded-full bg-white/40" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-[1301] w-9 h-9 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center hover:bg-foreground/30 transition-colors"
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

            <div className="relative z-10 pt-14 px-6 pb-0">
              <HolographicCard
                rarity={card.rarity}
                appearAnimation={detailAppearClass}
                onTap={card.image ? openFullscreenImage : undefined}
                subjectBox={card.subjectBox}
                noHolo={isUncaptured}
                className={`relative mx-auto max-w-[280px] aspect-[4/5] rounded-2xl ${card.image ? 'cursor-pointer' : ''}`}
              >
                <div
                  className={`relative w-full h-full rounded-[1.75rem] overflow-hidden holo-frame holo-frame--${card.rarity}`}
                >

                  <div className="relative w-full h-full rounded-[1.125rem] overflow-hidden">

                    {card.image ? (
                      <img src={card.image} alt={card.name} loading="eager" decoding="async" fetchPriority="high" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                    ) : (
                      (() => {
                        const CatIcon = getCategoryIcon(card.category);
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30">
                            <div className="relative">
                              <div className="absolute inset-0 rounded-full bg-muted-foreground/5 animate-pulse" />
                              <CatIcon className="w-20 h-20 text-muted-foreground/40 relative z-10" strokeWidth={1.5} />
                            </div>
                            <div className="mt-4 px-5 text-center">
                              <p className="text-xs font-display font-semibold text-muted-foreground/70">Non découvert</p>
                            </div>
                          </div>
                        );
                      })()
                    )}
                    {/* Glass shimmer overlay on image */}
                    {card.image && isMythic && <div className="detail-mythic-glass" />}
                    {card.image && isEpic && <div className="detail-epic-glass" />}
                    {card.image && isRare && <div className="detail-rare-glass" />}
                    {/* Name overlay bottom-left */}
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none p-3 pr-4 pt-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
                      <h3 className="text-white font-display font-bold text-base leading-tight drop-shadow-md">{card.name}</h3>
                      {card.scientificName && (
                        <p className="text-white/85 text-[11px] italic font-body leading-tight mt-0.5 drop-shadow">{card.scientificName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </HolographicCard>
            </div>

            <div className="relative z-10 text-center px-6 pt-2 pb-14" />

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
                <span className={`text-sm font-display font-semibold ${showComments ? 'text-primary' : 'text-muted-foreground'}`}>{commentCount}</span>
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
              <StatCard icon={<Leaf className="w-4 h-4" />} label="Lieu" value={location || 'Non renseigné'} color="text-forest-light" bg="bg-forest-light/8"
                link={card.latitude && card.longitude ? `https://www.google.com/maps?q=${card.latitude},${card.longitude}` : undefined}
              />
            </div>

            {/* Location editor (owner only) */}
            {isOwner && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">Localisation</p>
                  {!editingLocation && (
                    <button
                      onClick={() => { setEditingLocation(true); setLocQuery(''); }}
                      className="text-xs font-display font-semibold text-primary"
                    >
                      {location ? 'Modifier' : 'Ajouter'}
                    </button>
                  )}
                </div>
                {editingLocation ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={locQuery}
                      onChange={(e) => setLocQuery(e.target.value)}
                      autoFocus
                      placeholder="Rechercher une commune…"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {locLoading && <p className="text-[11px] text-muted-foreground">Recherche…</p>}
                    {locResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                        {locResults.map((c, i) => (
                          <button
                            key={`${c.nom}-${i}`}
                            onClick={() => saveLocation(c.nom, c.centre?.coordinates)}
                            disabled={savingLocation}
                            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-60"
                          >
                            {c.nom}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {location ? (
                        <button
                          onClick={() => saveLocation(null)}
                          disabled={savingLocation}
                          className="text-xs font-display font-semibold text-destructive disabled:opacity-60"
                        >
                          Retirer la localisation
                        </button>
                      ) : <span />}
                      <button
                        onClick={() => { setEditingLocation(false); setLocQuery(''); setLocResults([]); }}
                        className="px-3 py-1.5 rounded-full text-xs font-display font-semibold bg-muted text-muted-foreground"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-foreground/80">{location || 'Non renseignée'}</p>
                )}
              </div>
            )}


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

            {/* Personal note (owner only) */}
            {isOwner && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">Ma note</p>
                  {!editingNote && (
                    <button
                      onClick={() => { setNoteDraft(note); setEditingNote(true); }}
                      className="text-xs font-display font-semibold text-primary"
                    >
                      {note ? 'Modifier' : 'Ajouter'}
                    </button>
                  )}
                </div>
                {editingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value.slice(0, 500))}
                      maxLength={500}
                      rows={4}
                      autoFocus
                      placeholder="Où l'as-tu vu ? Que faisait-il ? Note tes observations…"
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{noteDraft.length}/500</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setNoteDraft(note); setEditingNote(false); }}
                          className="px-3 py-1.5 rounded-full text-xs font-display font-semibold bg-muted text-muted-foreground"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={saveNote}
                          disabled={savingNote}
                          className="px-3 py-1.5 rounded-full text-xs font-display font-semibold bg-primary text-primary-foreground disabled:opacity-60"
                        >
                          {savingNote ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : note ? (
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{note}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune note pour l'instant.</p>
                )}
              </div>
            )}



            {/* Delete own capture */}
            {isOwner && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive font-display font-semibold text-sm hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer cette capture
              </button>
            )}
          </div>

          </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Fullscreen image - outside Sheet to avoid portal conflicts */}
      {imageFullscreen && card.image && (
        <div
          className={`detail-fullscreen fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden detail-hero-${card.rarity}`}
          onClick={() => {
            if (zoom.scale > 1.05) {
              resetZoom();
            } else {
              setImageFullscreen(false);
            }
          }}
          onTouchStart={handleFullscreenTouchStart}
          onTouchMove={handleFullscreenTouchMove}
          onTouchEnd={handleFullscreenTouchEnd}
        >
          {/* Stable fullscreen backdrop: the holo effect itself stays on the card only. */}
          <div className="absolute inset-0 bg-black/90 pointer-events-none" />

          <div
            className="relative w-full h-full max-w-[min(100vw,100vh)] max-h-screen z-10 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`pointer-events-auto ${zoomInteracting ? 'transition-none' : 'transition-transform duration-150 ease-out'}`}
              style={{
                // No transform at all while idle: an ancestor transform forces the
                // blended holo layers into a separate backdrop and makes them flicker.
                transform: zoom.scale > 1.001 || zoom.x || zoom.y
                  ? `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px)`
                  : undefined,
                willChange: zoomInteracting ? 'transform' : undefined,
                touchAction: 'none',
              }}
            >

              <HolographicCard
                rarity={card.rarity}
                subjectBox={card.subjectBox}
                containInteraction
                paused={zoomInteracting || zoom.scale > 1.01}
                className="holo-fullscreen-photo relative rounded-2xl pointer-events-auto touch-none"
              >
                <div className={`relative w-full h-full rounded-[1.5rem] overflow-hidden shadow-2xl holo-frame holo-frame--fullscreen holo-frame--${card.rarity}`}>
                  <div className="relative w-full h-full rounded-[0.875rem] overflow-hidden bg-black/30">
                    <div className="absolute inset-0">

                      <img
                        src={card.image}
                        alt={card.name}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                      />
                      {isMythic && <div className="detail-mythic-glass detail-glass--fullscreen" />}
                      {isEpic && <div className="detail-epic-glass detail-glass--fullscreen" />}
                      {isRare && <div className="detail-rare-glass detail-glass--fullscreen" />}
                    </div>
                    {/* Name overlay bottom-left */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-5 pr-6 pt-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <h3 className="text-white font-display font-bold text-2xl leading-tight drop-shadow-lg">{card.name}</h3>
                      {card.scientificName && (
                        <p className="text-white/90 text-sm italic font-body leading-tight mt-1 drop-shadow">{card.scientificName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </HolographicCard>
            </div>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (zoom.scale > 1.05) {
                resetZoom();
              } else {
                setImageFullscreen(false);
              }
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 z-[60] w-16 h-16 -m-1 p-1 rounded-full flex items-center justify-center text-white/90 active:text-white transition-colors"
            style={{ touchAction: 'manipulation' }}
            aria-label="Fermer l'image en plein écran"
          >
            <span className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-2xl font-light leading-none pointer-events-none">✕</span>
          </button>

        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="z-[10000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette capture ?</AlertDialogTitle>
            <AlertDialogDescription>
              {card.name} sera retiré de ton Faunex et de ton nombre d'espèces. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
