import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, UserCheck, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { rarityBorderColor } from '@/lib/bestiary';
import RarityBadge from '@/components/RarityBadge';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type AnimalCard, type Rarity, RARITY_LABELS, RARITY_ORDER, RARITY_RANK, RARITY_FX, normalizeRarity } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { followUser as followUserUtil } from '@/lib/followUtils';

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  total: number;
}

const BADGE_DEFS: BadgeDef[] = [
  { id: 'first_capture', name: 'Première capture', icon: '📸', description: 'Capturer ton premier animal', total: 1 },
  { id: 'explorer_10', name: 'Explorateur', icon: '🧭', description: 'Réaliser 10 captures', total: 10 },
  { id: 'explorer_25', name: 'Naturaliste', icon: '🌿', description: 'Réaliser 25 captures', total: 25 },
  { id: 'explorer_50', name: 'Expert faune', icon: '🔬', description: 'Réaliser 50 captures', total: 50 },
  { id: 'birds_5', name: 'Ornithologue', icon: '🐦', description: 'Capturer 5 oiseaux', total: 5 },
  { id: 'mammals_5', name: 'Mammalogiste', icon: '🦊', description: 'Capturer 5 mammifères', total: 5 },
  { id: 'rare_1', name: 'Chasseur rare', icon: '💎', description: 'Trouver un animal rare ou mieux', total: 1 },
  { id: 'legendary_1', name: 'Éclat argenté', icon: '⭐', description: 'Trouver une espèce ultra rare', total: 1 },
  { id: 'mythic_1', name: 'Étoile dorée !', icon: '🔥', description: 'Trouver une espèce de rareté or', total: 1 },
  { id: 'social_3', name: 'Sociable', icon: '🤝', description: 'Suivre 3 explorateurs', total: 3 },
  { id: 'level_5', name: 'Niveau 5', icon: '🏅', description: 'Atteindre le niveau 5', total: 5 },
];

interface BadgeProgress {
  badge: BadgeDef;
  progress: number;
  earned: boolean;
}

const rarityFilters: (Rarity | 'all')[] = ['all', ...RARITY_ORDER];

interface FollowProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  total_captures: number;
}

const FriendCollectionPage = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);

  const [captures, setCaptures] = useState<AnimalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profileLevel, setProfileLevel] = useState(0);
  const [profileXp, setProfileXp] = useState(0);
  const [profileXpToNext, setProfileXpToNext] = useState(1000);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileTotalCaptures, setProfileTotalCaptures] = useState(0);
  const [amIFollowing, setAmIFollowing] = useState(false);
  const [badges, setBadges] = useState<BadgeProgress[]>([]);

  // Counts
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState<'following' | 'followers' | null>(null);
  const [sheetProfiles, setSheetProfiles] = useState<FollowProfile[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());

  const myId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);

      const [profileRes, capturesRes, followingCountRes, followersCountRes] = await Promise.all([
        supabase.from('profiles').select('display_name, username, level, xp, xp_to_next, avatar_url, total_captures').eq('user_id', userId).maybeSingle(),
        fetchAllRows<any>((from, to) => supabase.from('captures').select('*').eq('user_id', userId).eq('status', 'approved').order('created_at', { ascending: false }).range(from, to)),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      ]);

      setProfileName(profileRes.data?.display_name || profileRes.data?.username || t('social.friendCollection.defaultName'));
      setProfileLevel(profileRes.data?.level || 0);
      setProfileXp(profileRes.data?.xp || 0);
      setProfileXpToNext(profileRes.data?.xp_to_next || 1000);
      setProfileAvatar(profileRes.data?.avatar_url || null);
      setProfileTotalCaptures(profileRes.data?.total_captures || 0);
      setFollowingCount(followingCountRes.count || 0);
      setFollowersCount(followersCountRes.count || 0);

      if (myId && myId !== userId) {
        const { data: followData } = await supabase.from('explorer_follows')
          .select('id')
          .eq('follower_id', myId)
          .eq('following_id', userId)
          .limit(1);
        setAmIFollowing(!!followData && followData.length > 0);
      }

      if (!capturesRes.error && capturesRes.data) {
        setCaptures(capturesRes.data.map((c: any) => ({
          id: c.id,
          name: c.animal_name,
          scientificName: c.scientific_name || '',
          image: c.image_url,
          subjectBox: c.subject_bbox,
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

      // Compute badges
      const rawCaptures = capturesRes.data || [];
      const totalCaptures = rawCaptures.length;
      const birdCount = rawCaptures.filter((c: any) => c.category?.toLowerCase().includes('oiseau')).length;
      const mammalCount = rawCaptures.filter((c: any) => c.category?.toLowerCase().includes('mammif')).length;
      const hasRare = rawCaptures.some((c: any) => (RARITY_RANK[normalizeRarity(c.rarity)] ?? 0) >= 2);
      const hasLegendary = rawCaptures.some((c: any) => RARITY_FX[normalizeRarity(c.rarity)] === 'silver');
      const hasMythic = rawCaptures.some((c: any) => RARITY_FX[normalizeRarity(c.rarity)] === 'gold');
      const level = profileRes.data?.level || 1;
      const followCount = followingCountRes.count || 0;

      const progressMap: Record<string, number> = {
        first_capture: Math.min(totalCaptures, 1),
        explorer_10: Math.min(totalCaptures, 10),
        explorer_25: Math.min(totalCaptures, 25),
        explorer_50: Math.min(totalCaptures, 50),
        birds_5: Math.min(birdCount, 5),
        mammals_5: Math.min(mammalCount, 5),
        rare_1: hasRare ? 1 : 0,
        legendary_1: hasLegendary ? 1 : 0,
        mythic_1: hasMythic ? 1 : 0,
        social_3: Math.min(followCount, 3),
        level_5: Math.min(level, 5),
      };

      setBadges(BADGE_DEFS.map(b => ({
        badge: b,
        progress: progressMap[b.id] || 0,
        earned: (progressMap[b.id] || 0) >= b.total,
      })));

      setLoading(false);
    };

    fetchData();
  }, [userId, myId]);

  const openSheet = useCallback(async (type: 'following' | 'followers') => {
    if (!userId || !myId) return;
    setSheetOpen(type);
    setLoadingSheet(true);

    const [{ data: listData }, { data: myData }] = await Promise.all([
      type === 'following'
        ? supabase.from('explorer_follows').select('following_id').eq('follower_id', userId)
        : supabase.from('explorer_follows').select('follower_id').eq('following_id', userId),
      supabase.from('explorer_follows').select('following_id').eq('follower_id', myId),
    ]);

    setMyFollowingIds(new Set((myData || []).map(f => f.following_id)));

    const ids = (listData || [])
      .map((f: any) => type === 'following' ? f.following_id : f.follower_id);

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, level, total_captures')
        .in('user_id', ids);
      setSheetProfiles((profiles || []) as FollowProfile[]);
    } else {
      setSheetProfiles([]);
    }

    setLoadingSheet(false);
  }, [userId, myId]);

  const filtered = captures.filter(c => {
    if (filter !== 'all' && c.rarity !== filter) return false;
    return true;
  });

  const toggleFollow = async () => {
    if (!myId || !userId) return;
    if (amIFollowing) {
      await supabase.from('explorer_follows').delete().eq('follower_id', myId).eq('following_id', userId);
      setAmIFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      toast.info(t('social.common.unfollow'));
    } else {
      const result = await followUserUtil(myId, userId);
      if (result.error) { toast.error(t('social.common.genericError')); return; }
      if (result.status === 'pending') {
        toast.success(t('social.common.followRequestSent'));
      } else {
        setAmIFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(t('social.common.followed'));
      }
    }
  };

  const followFromSheet = async (targetId: string) => {
    if (!myId) return;
    const result = await followUserUtil(myId, targetId);
    if (result.error === 'already_following') { toast.info(t('social.common.alreadyFollowing')); return; }
    if (result.error) { toast.error(t('social.common.genericError')); return; }
    if (result.status === 'pending') {
      toast.success(t('social.common.followRequestSent'));
    } else {
      toast.success(t('social.common.followed'));
      setMyFollowingIds(prev => new Set(prev).add(targetId));
    }
  };

  const unfollowFromSheet = async (targetId: string) => {
    if (!myId) return;
    await supabase.from('explorer_follows').delete().eq('follower_id', myId).eq('following_id', targetId);
    toast.info(t('social.common.unfollow'));
    setMyFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
  };

  const getFollowStatus = (uid: string): 'me' | 'following' | 'none' => {
    if (uid === myId) return 'me';
    if (myFollowingIds.has(uid)) return 'following';
    return 'none';
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
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
                <span className="text-[10px] text-muted-foreground font-display">{t('social.common.level', { level: profileLevel })}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground font-display">{t('social.friendCollection.xp', { xp: profileXp, xpToNext: profileXpToNext })}</span>
              </div>
              <Progress value={profileXpToNext > 0 ? (profileXp / profileXpToNext) * 100 : 0} className="h-1.5 mt-1 bg-muted/50 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-amber" />
            </div>
            {myId && myId !== userId && (
              <button
                onClick={toggleFollow}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-display font-semibold shrink-0 transition-colors ${
                  amIFollowing
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {amIFollowing ? <><UserCheck className="w-3.5 h-3.5" /> {t('social.common.following')}</> : <><UserPlus className="w-3.5 h-3.5" /> {t('social.common.follow')}</>}
              </button>
            )}
          </div>

          {/* Stats row: captures, following, followers */}
          <div className="flex items-center gap-5 pl-1">
            <div>
              <p className="text-sm font-display font-bold text-foreground">{profileTotalCaptures}</p>
              <p className="text-[9px] text-muted-foreground font-display">{t('social.friendCollection.statsCaptures')}</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <button onClick={() => openSheet('following')} className="text-left active:opacity-70 transition-opacity">
              <p className="text-sm font-display font-bold text-foreground">{followingCount}</p>
              <p className="text-[9px] text-muted-foreground font-display">{t('social.friendCollection.statsFollowing')}</p>
            </button>
            <div className="w-px h-6 bg-border" />
            <button onClick={() => openSheet('followers')} className="text-left active:opacity-70 transition-opacity">
              <p className="text-sm font-display font-bold text-foreground">{followersCount}</p>
              <p className="text-[9px] text-muted-foreground font-display">{t('social.friendCollection.statsFollowers')}</p>
            </button>
          </div>
        </div>
      </PageHeader>

      {/* Collection - always visible */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
          {rarityFilters.map((r) => {
            const isActive = filter === r;
            const fx = r === 'all' ? null : RARITY_FX[r as Rarity];
            const colorClasses = r === 'all'
              ? isActive ? 'bg-foreground text-background border-foreground shadow-md' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
              : fx === 'gold'
              ? isActive ? 'bg-rarity-gold/20 text-rarity-gold border-rarity-gold/50' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-gold/10 hover:text-rarity-gold hover:border-rarity-gold/30'
              : fx === 'silver'
              ? isActive ? 'bg-rarity-silver/20 text-rarity-silver border-rarity-silver/50' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-silver/10 hover:text-rarity-silver hover:border-rarity-silver/30'
              : isActive ? 'bg-foreground/10 text-foreground border-foreground/30' : 'bg-muted text-muted-foreground border-border hover:bg-foreground/5 hover:text-foreground hover:border-foreground/20';

            const dot = r === 'all' ? '' : fx === 'gold' ? 'bg-rarity-gold' : fx === 'silver' ? 'bg-rarity-silver' : 'bg-foreground/50';

            return (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-bold border transition-all duration-300 flex items-center gap-1 active:scale-95 ${colorClasses} ${isActive && r !== 'all' ? 'bestiary-filter-glow' : ''} ${fx === 'gold' ? 'gold-filter-shimmer' : ''}`}
              >
                {r !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${dot} ${isActive ? 'animate-pulse' : ''}`} />}
                {r === 'all' ? t('social.friendCollection.filterAll') : RARITY_LABELS[r]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-3">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">{t('social.common.loading')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${rarityBorderColor[card.rarity] || 'border-border'} bg-card`}
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
<div className="absolute top-1 right-1">
                    <RarityBadge rarity={card.rarity} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8">
                    <p className="text-xs font-display font-bold text-white truncate leading-tight">
                      {card.name}
                    </p>
                    {card.scientificName && (
                      <p className="text-[9px] font-body italic text-white/80 truncate">
                        {card.scientificName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16 px-6">
                {filter !== 'all' && captures.length > 0 ? (
                  <>
                    <p className="text-4xl mb-3">
                      {RARITY_FX[filter as Rarity] === 'gold' ? '✨' : RARITY_FX[filter as Rarity] === 'silver' ? '⚡' : (RARITY_RANK[filter as Rarity] ?? 0) >= 2 ? '💎' : '🌿'}
                    </p>
                    <p className="text-foreground font-display font-semibold text-sm mb-2">
                      {t('social.friendCollection.noSpeciesRarity', { rarity: RARITY_LABELS[filter].toLowerCase() })}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {RARITY_FX[filter as Rarity] === 'gold'
                        ? t('social.friendCollection.descGold')
                        : RARITY_FX[filter as Rarity] === 'silver'
                        ? t('social.friendCollection.descSilver')
                        : (RARITY_RANK[filter as Rarity] ?? 0) >= 2
                        ? t('social.friendCollection.descRare')
                        : t('social.friendCollection.descCommon')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-muted-foreground font-display">
                      {captures.length === 0 ? t('social.friendCollection.noSharedCaptures') : t('social.friendCollection.noSpeciesFound')}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Earned badges at bottom */}
            {badges.filter(b => b.earned).length > 0 && (
              <div className="mt-8 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber/15 border border-amber/25 flex items-center justify-center">
                    <Award className="w-4 h-4 text-amber" />
                  </div>
                  <h3 className="text-sm font-display font-black text-foreground">{t('social.friendCollection.badgesUnlocked')}</h3>
                  <span className="text-[10px] font-display font-semibold text-amber bg-amber/10 border border-amber/20 px-2 py-0.5 rounded-full">
                    🏆 {badges.filter(b => b.earned).length}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {badges.filter(b => b.earned).map(({ badge }, i) => (
                    <div
                      key={badge.id}
                      className="relative rounded-xl p-2.5 text-center bg-gradient-to-b from-amber/10 via-amber/5 to-card border border-amber/30 shadow-[0_0_12px_hsla(42,85%,55%,0.1)] game-card-appear"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="mx-auto w-10 h-10 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center mb-1.5">
                        <span className="text-xl badge-icon-float">{badge.icon}</span>
                      </div>
                      <p className="text-[10px] font-display font-black leading-tight text-foreground">{t(`social.friendCollection.badges.${badge.id}_name`)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Following / Followers Sheet */}
      <Sheet open={!!sheetOpen} onOpenChange={(open) => !open && setSheetOpen(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-base">
              {sheetOpen === 'following' ? t('social.friendCollection.sheetTitleFollowing') : t('social.friendCollection.sheetTitleFollowers')}
            </SheetTitle>
          </SheetHeader>
          {loadingSheet ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-display text-sm">{t('social.common.loading')}</p>
            </div>
          ) : sheetProfiles.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-display font-semibold text-sm mb-1">
                {sheetOpen === 'following' ? t('social.friendCollection.sheetEmptyFollowingTitle') : t('social.friendCollection.sheetEmptyFollowersTitle')}
              </p>
              <p className="text-muted-foreground text-xs">
                {sheetOpen === 'following'
                  ? t('social.friendCollection.sheetEmptyFollowingDesc', { name: profileName })
                  : t('social.friendCollection.sheetEmptyFollowersDesc', { name: profileName })}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-y-auto max-h-[55vh]">
              {sheetProfiles.map((friend, i) => {
                const status = getFollowStatus(friend.user_id);
                return (
                  <div
                    key={friend.user_id}
                    className="flex items-center gap-3 py-3 quest-card-enter"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <button
                      onClick={() => { setSheetOpen(null); navigate(`/explorer/${friend.user_id}/collection`); }}
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
                        <p className="text-sm font-display font-semibold text-foreground truncate">{friend.display_name || t('social.common.noName')}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{t('social.friendCollection.friendRow', { username: friend.username, level: friend.level, count: friend.total_captures })}</p>
                      </div>
                    </button>
                    <div className="shrink-0">
                      {status === 'me' ? (
                        <span className="text-[10px] text-muted-foreground font-display">{t('social.common.you')}</span>
                      ) : status === 'following' ? (
                        <button
                          onClick={() => unfollowFromSheet(friend.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-display font-semibold"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> {t('social.common.following')}
                        </button>
                      ) : (
                        <button
                          onClick={() => followFromSheet(friend.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold active:scale-95 transition-transform"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> {t('social.common.follow')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default FriendCollectionPage;
