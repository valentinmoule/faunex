import { useState, useEffect, useCallback, useRef, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { notifyCaptureInteraction } from '@/lib/notifyCaptureInteraction';
import { Drawer } from 'vaul';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { type AnimalCard, type Rarity, RARITY_LABELS, RARITY_FX, normalizeRarity } from '@/data/mockData';
import { categoryLabel } from '@/lib/bestiary';
import { MapPin, Leaf, UtensilsCrossed, Shield, Sparkles, Heart, MessageCircle, Send, PawPrint, Bird, Fish, Bug, Turtle, Shell, Snail, Waves, Lock, Camera, Pencil, Calendar, StickyNote, Users, type LucideIcon } from 'lucide-react';
import { FrogIcon } from '@/components/icons/FrogIcon';
import { SpiderIcon } from '@/components/icons/SpiderIcon';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import HolographicCard from '@/components/HolographicCard';
import RarityBadge from '@/components/RarityBadge';
import FindersBadge from '@/components/FindersBadge';
import { hapticTap } from '@/lib/haptics';
import { toast } from '@/hooks/use-toast';
import { Trash2, Share2, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import ShareCaptureSheet from '@/components/ShareCaptureSheet';
import { useSpeciesFinders } from '@/hooks/useSpeciesFinders';
import { useSpeciesFacts, useSpeciesName } from '@/hooks/useSpeciesLocale';

interface Props {
  card: AnimalCard | null;
  open: boolean;
  onClose: () => void;
  /** Nombre de naturalistes ayant capturé l'espèce (fiche "non découverte" du bestiaire). */
  communityFinders?: number;
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
  common: 'from-[hsl(220,9%,52%)] to-[hsl(220,9%,38%)]',
  uncommon: 'from-[hsl(222,12%,44%)] to-[hsl(222,12%,30%)]',
  rare: 'from-[hsl(225,16%,32%)] to-[hsl(225,16%,20%)]',
  very_rare: 'from-[hsl(230,20%,20%)] to-[hsl(230,22%,10%)]',
  ultra_rare: 'from-[hsl(220,20%,72%)] to-[hsl(220,14%,48%)]',
  illustration_rare: 'from-[hsl(43,90%,60%)] to-[hsl(40,80%,42%)]',
  special_rare: 'from-[hsl(40,95%,55%)] to-[hsl(36,85%,38%)]',
  hyper_rare: 'from-[hsl(42,100%,60%)] to-[hsl(30,95%,40%)]',
};

const rarityBg: Record<Rarity, string> = {
  common: 'bg-rarity-common/15',
  uncommon: 'bg-rarity-uncommon/15',
  rare: 'bg-rarity-rare/15',
  very_rare: 'bg-rarity-very-rare/15',
  ultra_rare: 'bg-rarity-silver/15',
  illustration_rare: 'bg-rarity-gold/15',
  special_rare: 'bg-rarity-gold/15',
  hyper_rare: 'bg-rarity-gold/15',
};

const rarityText: Record<Rarity, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  very_rare: 'text-rarity-very-rare',
  ultra_rare: 'text-rarity-silver',
  illustration_rare: 'text-rarity-gold',
  special_rare: 'text-rarity-gold',
  hyper_rare: 'text-rarity-gold',
};
const getCategoryIcon = (category: string): ComponentType<{ className?: string; strokeWidth?: string | number }> => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return Bird;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish;
  if (cat.includes('arachnide')) return SpiderIcon;
  if (cat.includes('insecte')) return Bug;
  if (cat.includes('reptile')) return Turtle;
  if (cat.includes('amphibien')) return FrogIcon;
  if (cat.includes('crustacé')) return Shell;
  if (cat.includes('mollusque')) return Snail;
  if (cat.includes('mammifère') && cat.includes('marin')) return Waves;
  if (cat.includes('mammifère')) return PawPrint;
  return PawPrint;
};

const LockedField = ({ icon, label }: { icon: React.ReactNode; label: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5">
      <div className="text-muted-foreground/60">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <p className="text-sm text-muted-foreground/50 italic truncate">{t('capture.detail.toDiscover')}</p>
      </div>
      <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
    </div>
  );
};


const CardDetailSheet = ({ card, open, onClose, communityFinders, onDeleted }: Props) => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  // Nom commun localisé + fiche d'espèce localisée (traduite à la demande, puis cachée).
  const { speciesName } = useSpeciesName();
  const displayName = speciesName(card?.name);
  const facts = useSpeciesFacts(
    open && card
      ? {
          name: card.name,
          scientificName: card.scientificName,
          description: card.description,
          habitat: card.habitat,
          diet: card.diet,
          funFact: card.funFact,
        }
      : null,
  );

  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites(session?.user?.id);
  const [isOwner, setIsOwner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState(false);
  const [takenAt, setTakenAt] = useState<string | null>(null);
  const [savingDate, setSavingDate] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locQuery, setLocQuery] = useState('');
  const [locResults, setLocResults] = useState<{ label: string; sub: string; coords?: [number, number] }[]>([]);
  const [locLoading, setLocLoading] = useState(false);

  /* Nombre de naturalistes ayant capturé l'espèce : fourni par le parent, sinon chargé ici. */
  const fetchedFinders = useSpeciesFinders(card?.name, open && communityFinders === undefined);
  const finders = communityFinders ?? fetchedFinders;





  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
    hapticTap();
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
    setTakenAt(null);
    if (!card || !open || !session?.user) return;
    if (!card.image || card.id.startsWith('uncaptured-')) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('captures')
        .select('user_id, note, location, taken_at')
        .eq('id', card.id)
        .maybeSingle();
      if (!cancelled && data) {
        setIsOwner((data as any).user_id === session.user.id);
        setNote((data as any).note || '');
        setNoteDraft((data as any).note || '');
        setLocation((data as any).location || null);
        setTakenAt((data as any).taken_at || null);
      }
    })();
    return () => { cancelled = true; };
  }, [card, open, session]);

  // Debounced location search: French communes (with postal code) + worldwide places
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
        const [frRes, worldRes] = await Promise.allSettled([
          fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,centre,codesPostaux,codeDepartement&boost=population&limit=8`).then(r => r.json()),
          fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8&accept-language=fr`).then(r => r.json()),
        ]);

        const results: { label: string; sub: string; coords?: [number, number] }[] = [];

        if (frRes.status === 'fulfilled' && Array.isArray(frRes.value)) {
          for (const c of frRes.value) {
            const cp = Array.isArray(c.codesPostaux) && c.codesPostaux.length ? c.codesPostaux[0] : '';
            results.push({
              label: cp ? `${c.nom} (${cp})` : c.nom,
              sub: 'France',
              coords: c.centre?.coordinates,
            });
          }
        }

        if (worldRes.status === 'fulfilled' && Array.isArray(worldRes.value)) {
          for (const p of worldRes.value) {
            const a = p.address || {};
            const city = a.city || a.town || a.village || a.municipality || a.county || p.name;
            if (!city) continue;
            const cp = a.postcode || '';
            const country = a.country || '';
            if (country === 'France' && results.some(r => r.label.startsWith(city))) continue;
            const label = cp ? `${city} (${cp})` : city;
            if (results.some(r => r.label === label && r.sub === country)) continue;
            results.push({
              label,
              sub: [a.state, country].filter(Boolean).join(', ') || country,
              coords: [parseFloat(p.lon), parseFloat(p.lat)],
            });
          }
        }

        if (!cancelled) setLocResults(results.slice(0, 12));
      } catch {
        if (!cancelled) setLocResults([]);
      } finally {
        if (!cancelled) setLocLoading(false);
      }
    }, 300);
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
      toast({ title: t('capture.detail.toastLocationNotSaved'), description: t('capture.detail.toastRetry'), variant: 'destructive' });
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
    toast({ title: nom ? t('capture.detail.toastLocationUpdated') : t('capture.detail.toastLocationRemoved') });
  }, [card, savingLocation]);

  const saveDate = useCallback(async (value: string) => {
    if (!card || savingDate || !value) return;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86400000) return;
    setSavingDate(true);
    const iso = date.toISOString();
    const { error } = await supabase.from('captures').update({ taken_at: iso }).eq('id', card.id);
    setSavingDate(false);
    if (error) {
      toast({ title: t('capture.detail.toastDateNotSaved'), description: t('capture.detail.toastRetry'), variant: 'destructive' });
      return;
    }
    setTakenAt(iso);
    toast({ title: t('capture.detail.toastDateUpdated') });
  }, [card, savingDate]);

  const saveNote = useCallback(async () => {
    if (!card || savingNote) return;
    const clean = noteDraft.trim().slice(0, 500);
    setSavingNote(true);
    const { error } = await supabase.from('captures').update({ note: clean || null }).eq('id', card.id);
    setSavingNote(false);
    if (error) {
      toast({ title: t('capture.detail.toastNoteNotSaved'), description: t('capture.detail.toastRetry'), variant: 'destructive' });
      return;
    }
    setNote(clean);
    setNoteDraft(clean);
    setEditingNote(false);
    toast({ title: clean ? t('capture.detail.toastNoteSaved') : t('capture.detail.toastNoteDeleted') });
  }, [card, noteDraft, savingNote]);

  const handleDelete = useCallback(async () => {
    if (!card || deleting) return;
    setDeleting(true);
    const { error } = await supabase.from('captures').delete().eq('id', card.id);
    setDeleting(false);
    if (error) {
      toast({ title: t('capture.detail.toastDeleteImpossible'), description: t('capture.detail.toastRetry'), variant: 'destructive' });
      return;
    }

    setConfirmDelete(false);
    toast({ title: t('capture.detail.toastCaptureDeleted'), description: t('capture.detail.toastCaptureDeletedDesc') });
    onDeleted?.(card.id);
    onClose();
  }, [card, deleting, onDeleted, onClose]);

  // Escape closes the delete confirmation
  useEffect(() => {
    if (!confirmDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setConfirmDelete(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete, deleting]);




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
    if (mins < 1) return t('capture.detail.timeAgoNow');
    if (mins < 60) return t('capture.detail.timeAgoMin', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('capture.detail.timeAgoHour', { count: hours });
    return t('capture.detail.timeAgoDay', { count: Math.floor(hours / 24) });
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

  const handleShare = useCallback(() => {
    if (!card?.image) return;
    setShareOpen(true);
  }, [card]);

  if (!card) return null;


  const isUncaptured = !card.image || card.id.startsWith('uncaptured-');
  const normalizedRarity = normalizeRarity(card.rarity);
  const cardFx = RARITY_FX[normalizedRarity];
  const isGold = !isUncaptured && cardFx === 'gold';
  const isSilver = !isUncaptured && cardFx === 'silver';
  const effectiveDate = takenAt || card?.discoveredAt || null;
  const dateInputValue = effectiveDate ? (() => { const d = new Date(effectiveDate); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : '';
  const todayInput = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const captureDate = effectiveDate
    ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(effectiveDate))
    : null;
  const isRare = !isUncaptured && cardFx === 'ink' && (normalizedRarity === 'rare' || normalizedRarity === 'very_rare');
  const heroFamily = normalizedRarity.replace(/_/g, '-');
  const isShiny = isSilver || isGold;

  const detailAppearClass = isGold
    ? 'animate-card-appear-gold'
    : isSilver
    ? 'animate-card-appear-silver'
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
          <div className={`relative overflow-hidden detail-hero-${heroFamily}`} style={{ zIndex: 0 }}>
            
            <div className="relative z-10 pt-14 px-6 pb-0">
              <HolographicCard
                rarity={card.rarity}
                appearAnimation={detailAppearClass}
                onTap={card.image ? openFullscreenImage : undefined}
                subjectBox={card.subjectBox}
                noHolo={isUncaptured}
                className={`relative mx-auto max-w-[280px] aspect-[4/5] rounded-[1.75rem] ${card.image ? 'cursor-pointer' : ''}`}
                style={{ ['--holo-radius' as any]: '1.75rem' }}

              >
                <div
                  className={`relative w-full h-full rounded-[1.75rem] overflow-hidden holo-frame holo-frame--${normalizeRarity(card.rarity).replace(/_/g, '-')}`}
                >
                  {/* Pastille de rareté sur la carte */}
                  <div className="absolute top-[14px] right-[14px] z-20 pointer-events-none">
                    <RarityBadge rarity={card.rarity} plain />
                  </div>

                  <div className="relative w-full h-full rounded-[1.25rem] overflow-hidden">

                    {card.image ? (
                      <img src={card.image} alt={displayName} loading="eager" decoding="async" fetchPriority="high" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                    ) : (
                      (() => {
                        const CatIcon = getCategoryIcon(card.category);
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-muted/40 via-muted/70 to-muted/90">
                            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--background)) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                            <div className="relative z-10 mb-6">
                              <CatIcon className="w-16 h-16 text-white drop-shadow-sm" strokeWidth={1.5} />
                            </div>
                            <div className="relative z-10 space-y-1.5 max-w-[240px]">
                              <p className="text-xl font-display font-bold text-white tracking-tight drop-shadow-md">
                                {t('capture.detail.undiscoveredTitle')}
                              </p>
                              <p className="text-sm font-body text-white/85 leading-relaxed drop-shadow-sm">
                                {t('capture.detail.undiscoveredBody')}
                              </p>
                            </div>
                          </div>
                        );
                      })()
                    )}
                    {/* Glass shimmer overlay on image */}
                    {card.image && isGold && <div className="detail-gold-glass" />}
                    {card.image && isSilver && <div className="detail-silver-glass" />}
                    {card.image && isRare && <div className="detail-rare-glass" />}
                    {/* Name overlay bottom-left */}
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none p-3 pr-4 pt-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
                      <h3 className="text-white font-display font-bold text-base leading-tight drop-shadow-md">{displayName}</h3>
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

            {/* Like & Comment bar — hidden for undiscovered animals */}
            {!isUncaptured && (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={handleLike}
                  aria-pressed={liked}
                  aria-label={t('capture.detail.like')}
                  title={t('capture.detail.like')}
                  className="relative flex items-center gap-2 py-2.5 before:absolute before:-inset-2.5 before:content-[''] group"
                >
                  <Heart className={`w-6 h-6 transition-all ${liked ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground group-hover:text-destructive'}`} />
                  {likeCount > 0 && (
                    <span className={`text-sm font-display font-semibold ${liked ? 'text-destructive' : 'text-muted-foreground'}`}>{likeCount}</span>
                  )}
                </button>
                <button
                  onClick={() => setShowComments(!showComments)}
                  aria-expanded={showComments}
                  aria-label={t('capture.detail.comments')}
                  title={t('capture.detail.comments')}
                  className="relative flex items-center gap-2 py-2.5 before:absolute before:-inset-2.5 before:content-[''] group"
                >
                  <MessageCircle className={`w-6 h-6 transition-colors ${showComments ? 'text-primary fill-primary/20' : 'text-muted-foreground group-hover:text-primary'}`} />
                  {commentCount > 0 && (
                    <span className={`text-sm font-display font-semibold ${showComments ? 'text-primary' : 'text-muted-foreground'}`}>{commentCount}</span>
                  )}
                </button>
                {isOwner && (
                  <button
                    onClick={() => {
                      hapticTap();
                      void toggleFavorite(card.id);
                    }}
                    aria-pressed={isFavorite(card.id)}
                    aria-label={t('capture.detail.favorite')}
                    title={t('capture.detail.favorite')}
                    className="relative flex items-center py-2.5 before:absolute before:-inset-2.5 before:content-[''] group"
                  >
                    <Bookmark className={`w-6 h-6 transition-all ${isFavorite(card.id) ? 'fill-primary text-primary scale-110' : 'text-muted-foreground group-hover:text-primary'}`} />
                  </button>
                )}
                {card.image && (
                  <button
                    onClick={handleShare}
                    aria-label={t('capture.detail.share')}
                    title={t('capture.detail.share')}
                    className="relative flex items-center py-2.5 before:absolute before:-inset-2.5 before:content-[''] group"
                  >
                    <Share2 className="w-6 h-6 text-muted-foreground transition-colors group-hover:text-primary" />
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => { hapticTap(); setConfirmDelete(true); }}
                    aria-label={t('capture.detail.deleteCapture')}
                    title={t('capture.detail.deleteCapture')}
                    className="relative flex items-center py-2.5 before:absolute before:-inset-2.5 before:content-[''] group"
                  >
                    <Trash2 className="w-6 h-6 text-muted-foreground transition-colors group-hover:text-destructive" />
                  </button>
                )}
              </div>
            )}

            {/* Comments section */}
            {showComments && (
              <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">{t('capture.detail.noComments')}</p>
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
                              {comment.profile?.display_name || comment.profile?.username || t('capture.detail.anonymous')}
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
                    placeholder={t('capture.detail.commentPlaceholder')}
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



{isUncaptured ? (
              <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] p-4 text-center">
                <div className="mx-auto mb-2.5 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-display font-semibold text-foreground mb-1">
                  {t('capture.detail.exploreTitle')}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('capture.detail.exploreDesc')}
                </p>
                {finders !== undefined && (
                  <div className="mt-3 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 border border-border px-3 py-1.5">
                      <FindersBadge count={finders} />
                      <span className="text-[11px] font-display font-medium text-muted-foreground">
                        {finders > 0
                          ? t('capture.finders.alreadyCaptured')
                          : t('capture.finders.noneYet')}
                      </span>
                    </span>
                  </div>
                )}
              </div>

            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed text-center max-w-sm mx-auto">{facts.description}</p>
            )}

            {/* Infos — liste épurée façon iOS */}
            {isUncaptured ? (
              <div className="space-y-2.5">
                <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
                  <DetailRow
                    icon={<Sparkles className="w-4 h-4" />}
                    label={t('capture.detail.rarityLabel')}
                    value={<RarityBadge rarity={card.rarity} plain showLabel className="detail-rarity-line" />}
                  />
                  {(() => {
                    const CatIcon = getCategoryIcon(card.category);
                    return (
                      <DetailRow
                        icon={<CatIcon className="w-4 h-4" />}
                        label={t('capture.detail.categoryLabel')}
                        value={categoryLabel(card.category)}
                      />
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <LockedField icon={<MapPin className="w-4 h-4" />} label={t('capture.detail.habitat')} />
                  <LockedField icon={<UtensilsCrossed className="w-4 h-4" />} label={t('capture.detail.diet')} />
                  <LockedField icon={<Shield className="w-4 h-4" />} label={t('capture.detail.conservation')} />
                  <LockedField icon={<Leaf className="w-4 h-4" />} label={t('capture.detail.location')} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
                <DetailRow
                  icon={<Sparkles className="w-4 h-4" />}
                  label={t('capture.detail.rarityLabel')}
                  value={<RarityBadge rarity={card.rarity} plain showLabel className="detail-rarity-line" />}
                />
                {(() => {
                  const CatIcon = getCategoryIcon(card.category);
                  return (
                    <DetailRow
                      icon={<CatIcon className="w-4 h-4" />}
                      label={t('capture.detail.categoryLabel')}
                      value={categoryLabel(card.category)}
                    />
                  );
                })()}
                {finders !== undefined && finders > 0 && (
                  <DetailRow
                    icon={<Users className="w-4 h-4" />}
                    label={t('capture.detail.capturedByLabel')}
                    value={t('capture.finders.people', { count: finders })}
                  />
                )}

                <DetailRow icon={<MapPin className="w-4 h-4" />} label={t('capture.detail.habitat')} value={facts.habitat} />
                <DetailRow icon={<UtensilsCrossed className="w-4 h-4" />} label={t('capture.detail.diet')} value={facts.diet} />
                <DetailRow icon={<Shield className="w-4 h-4" />} label={t('capture.detail.conservation')} value={card.conservation} />
                {captureDate && (
                  <DetailRow
                    icon={<Calendar className="w-4 h-4" />}
                    label={t('capture.detail.capturedOnLabel')}
                    value={captureDate}
                    action={isOwner && !editingLocation && !editingNote ? (
                      <span className="relative inline-flex">
                        <button
                          type="button"
                          onClick={() => { const el = dateInputRef.current; if (!el) return; try { el.showPicker(); } catch { el.focus(); el.click(); } }}
                          disabled={savingDate}
                          aria-label={t('capture.detail.editDate')}
                          className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-60"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <input
                          ref={dateInputRef}
                          type="date"
                          tabIndex={-1}
                          aria-hidden="true"
                          value={dateInputValue}
                          max={todayInput}
                          onChange={(e) => { if (e.target.value && e.target.value !== dateInputValue) void saveDate(e.target.value); }}
                          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
                        />
                      </span>
                    ) : undefined}
                  />
                )}
                <DetailRow
                  icon={<Leaf className="w-4 h-4" />}
                  label={t('capture.detail.locationLabel')}
                  value={location || t('capture.detail.notSet')}
                  action={isOwner && !editingLocation && !editingNote ? (
                    <button
                      onClick={() => { setEditingLocation(true); setLocQuery(''); }}
                      aria-label={location ? t('capture.detail.modify') : t('capture.detail.add')}
                      className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  ) : undefined}
                />
                {isOwner && (
                  <DetailRow
                    icon={<StickyNote className="w-4 h-4" />}
                    label={t('capture.detail.myNote')}
                    value={note ? (
                      <span className="whitespace-pre-wrap">{note}</span>
                    ) : (
                      <span className="text-muted-foreground">{t('capture.detail.noNoteYet')}</span>
                    )}
                    action={!editingNote && !editingLocation ? (
                      <button
                        onClick={() => { setNoteDraft(note); setEditingNote(true); }}
                        aria-label={note ? t('capture.detail.modify') : t('capture.detail.add')}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    ) : undefined}
                  />
                )}
              </div>
            )}

            {/* Location editing (owner only) */}
            {!isUncaptured && editingLocation && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <input
                  type="text"
                  value={locQuery}
                  onChange={(e) => setLocQuery(e.target.value)}
                  autoFocus
                  placeholder={t('capture.detail.locationSearchPlaceholder')}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {locLoading && <p className="text-[11px] text-muted-foreground">{t('capture.detail.searching')}</p>}
                {locResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {locResults.map((c, i) => (
                      <button
                        key={`${c.label}-${c.sub}-${i}`}
                        onClick={() => saveLocation(c.sub ? `${c.label}, ${c.sub}` : c.label, c.coords)}
                        disabled={savingLocation}
                        className="w-full text-left px-3 py-2 hover:bg-muted disabled:opacity-60"
                      >
                        <span className="block text-sm text-foreground">{c.label}</span>
                        {c.sub && <span className="block text-[11px] text-muted-foreground">{c.sub}</span>}
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
                      {t('capture.detail.removeLocation')}
                    </button>
                  ) : <span />}
                  <button
                    onClick={() => { setEditingLocation(false); setLocQuery(''); setLocResults([]); }}
                    className="px-3 py-1.5 rounded-full text-xs font-display font-semibold bg-muted text-muted-foreground"
                  >
                    {t('capture.detail.cancel')}
                  </button>
                </div>
              </div>
            )}


            {/* Fun Fact — anecdote mise en avant */}
            {isUncaptured ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-muted-foreground/60">
                <Lock className="w-3.5 h-3.5" />
                <p className="text-sm italic">{t('capture.detail.hiddenFact')}</p>
              </div>
            ) : (
              <div className="detail-funfact">
                <div className="relative mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] font-display font-bold uppercase tracking-[0.14em] text-primary">
                    {t('capture.detail.didYouKnow')}
                  </p>
                </div>
                <p className="relative text-[15px] leading-relaxed text-foreground/85">{facts.funFact}</p>
              </div>
            )}

            {/* Note editing (owner only) — même style que l'édition de localisation */}
            {!isUncaptured && isOwner && editingNote && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={4}
                  autoFocus
                  placeholder={t('capture.detail.notePlaceholder')}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">{t('capture.manual.charCount', { count: noteDraft.length })}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setNoteDraft(note); setEditingNote(false); }}
                      className="px-3 py-1.5 rounded-full text-xs font-display font-semibold bg-muted text-muted-foreground"
                    >
                      {t('capture.detail.cancel')}
                    </button>
                    <button
                      onClick={saveNote}
                      disabled={savingNote}
                      className="px-3 py-1.5 rounded-full text-xs font-display font-semibold bg-primary text-primary-foreground disabled:opacity-60"
                    >
                      {savingNote ? t('capture.detail.saving') : t('capture.detail.saveNote')}
                    </button>
                  </div>
                </div>
              </div>
            )}



          </div>

          </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      <ShareCaptureSheet card={card} open={shareOpen} onClose={() => setShareOpen(false)} />

      {/* Fullscreen image - portalled to body so it stacks above the drawer */}
      {imageFullscreen && card.image && createPortal((
        <div
          className={`detail-fullscreen fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden detail-hero-${heroFamily}`}
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
                className="holo-fullscreen-photo relative rounded-[1.5rem] pointer-events-auto touch-none"
                style={{ ['--holo-radius' as any]: '1.5rem' }}
                overlay={<div className="holo-fullscreen-rarity"><RarityBadge rarity={card.rarity} plain /></div>}
              >
                <div className={`relative w-full h-full rounded-[1.5rem] overflow-hidden shadow-2xl holo-frame holo-frame--fullscreen holo-frame--${normalizeRarity(card.rarity).replace(/_/g, '-')}`}>
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/30">
                    <div className="absolute inset-0">

                      <img
                        src={card.image}
                        alt={displayName}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                      />
                      {isGold && <div className="detail-gold-glass detail-glass--fullscreen" />}
                      {isSilver && <div className="detail-silver-glass detail-glass--fullscreen" />}
                      {isRare && <div className="detail-rare-glass detail-glass--fullscreen" />}
                    </div>
                    {/* Name overlay bottom-left */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-5 pr-6 pt-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <h3 className="text-white font-display font-bold text-2xl leading-tight drop-shadow-lg">{displayName}</h3>
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
            aria-label={t('capture.detail.closeImage')}
          >
            <span className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-2xl font-light leading-none pointer-events-none">✕</span>
          </button>

        </div>
      ), document.body)}

      {/* Delete confirmation — portalled so it floats above the drawer */}
      {confirmDelete && createPortal((
        <div
          className="pointer-events-auto fixed inset-0 z-[10001] flex items-center justify-center px-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-capture-title"
          aria-describedby="delete-capture-desc"
        >
          <div className="delete-confirm-scrim" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="delete-confirm-card bg-background">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <h4 id="delete-capture-title" className="font-display font-bold text-base leading-tight text-foreground">
              {t('capture.detail.deleteDialogTitle')}
            </h4>
            <p id="delete-capture-desc" className="mt-1.5 text-sm leading-snug text-muted-foreground">
              {t('capture.detail.deleteDialogDesc', { name: displayName })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="py-3 rounded-2xl bg-muted text-foreground font-display font-semibold text-sm transition-colors hover:bg-muted/70 disabled:opacity-50"
              >
                {t('capture.detail.cancelDialog')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="py-3 rounded-2xl bg-destructive text-destructive-foreground font-display font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? t('capture.detail.deleting') : t('capture.detail.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </>

  );
};

const DetailRow = ({ icon, label, value, action }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; action?: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 px-4 py-3">
    <span className="mt-0.5 text-muted-foreground">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground/85 leading-snug mt-0.5">{value}</p>
    </div>
    {action}
  </div>
);

export default CardDetailSheet;
