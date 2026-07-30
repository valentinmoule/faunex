import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Camera, Target, ChevronRight, Bell, Flame, Zap, Trophy, BookOpen, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import AnimalCardComponent from '@/components/AnimalCardComponent';
import CardDetailSheet from '@/components/CardDetailSheet';
import NearbyAnimalsSection from '@/components/NearbyAnimalsSection';
import DailyQuestPopup from '@/components/DailyQuestPopup';
import WelcomeInstallPopup, { isFirstLogin } from '@/components/WelcomeInstallPopup';
import LoadingScreen from '@/components/LoadingScreen';
import { startOfWeekISO } from '@/lib/weekUtils';
import type { AnimalCard } from '@/data/mockData';

interface Profile {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  xp_to_next: number;
  total_captures: number;
}

interface QuestSummary {
  total: number;
  completed: number;
  claimable: number;
}

const RARITY_ORDER: Rarity[] = ['mythic', 'epic', 'rare', 'common'];

const BADGE_DEFS = [
  { id: 'first_capture', total: 1, type: 'captures' as const },
  { id: 'explorer_10', total: 10, type: 'captures' as const },
  { id: 'explorer_25', total: 25, type: 'captures' as const },
  { id: 'explorer_50', total: 50, type: 'captures' as const },
  { id: 'birds_5', total: 5, type: 'birds' as const },
  { id: 'mammals_5', total: 5, type: 'mammals' as const },
  { id: 'rare_1', total: 1, type: 'rare' as const },
  { id: 'legendary_1', total: 1, type: 'epic' as const },
  { id: 'mythic_1', total: 1, type: 'mythic' as const },
  { id: 'social_3', total: 3, type: 'follows' as const },
  { id: 'level_5', total: 5, type: 'level' as const },
];

async function checkBadgeNotifications(uid: string, captures: any[], profile: any) {
  const [claimedRes, followsRes, existingNotifRes] = await Promise.all([
    supabase.from('user_badges').select('badge_id').eq('user_id', uid),
    supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
    supabase.from('notifications').select('comment_text').eq('user_id', uid).eq('type', 'badge_earned'),
  ]);
  const claimed = new Set((claimedRes.data || []).map((b: any) => b.badge_id));
  const notified = new Set((existingNotifRes.data || []).map((n: any) => n.comment_text));
  const followsCount = followsRes.count || 0;

  const total = captures.length;
  const birds = captures.filter(c => c.category?.toLowerCase().includes('oiseau')).length;
  const mammals = captures.filter(c => c.category?.toLowerCase().includes('mammif')).length;
  const hasRare = captures.some(c => ['rare', 'epic', 'mythic'].includes(c.rarity));
  const hasEpic = captures.some(c => ['epic', 'mythic'].includes(c.rarity));
  const hasMythic = captures.some(c => c.rarity === 'mythic');
  const level = profile.level || 0;

  const earned = (b: typeof BADGE_DEFS[number]) => {
    switch (b.type) {
      case 'captures': return total >= b.total;
      case 'birds': return birds >= b.total;
      case 'mammals': return mammals >= b.total;
      case 'rare': return hasRare;
      case 'epic': return hasEpic;
      case 'mythic': return hasMythic;
      case 'follows': return followsCount >= b.total;
      case 'level': return level >= b.total;
    }
  };

  const toNotify = BADGE_DEFS.filter(b => earned(b) && !claimed.has(b.id) && !notified.has(b.id));
  if (toNotify.length === 0) return;

  await supabase.from('notifications').insert(
    toNotify.map(b => ({
      user_id: uid,
      type: 'badge_earned',
      actor_id: uid,
      comment_text: b.id,
    }))
  );
}

const Index = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allCaptures, setAllCaptures] = useState<AnimalCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [questSummary, setQuestSummary] = useState<QuestSummary>({ total: 0, completed: 0, claimable: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [rarityCounts, setRarityCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [allCapturedNames, setAllCapturedNames] = useState<string[]>([]);
  const isFirstTime = !!session?.user && isFirstLogin(session.user.id);

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;

    const fetchAll = async () => {
      const [profileRes, capturesRes, questsRes, notifRes] = await Promise.all([
        supabase.from('profiles').select('display_name, username, avatar_url, level, xp, xp_to_next, total_captures').eq('user_id', uid).single(),
        supabase.from('captures').select('*').eq('user_id', uid).eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('daily_quests').select('completed, claimed').eq('user_id', uid).eq('quest_date', startOfWeekISO()),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      
      let resolvedCaptureCards: AnimalCard[] = [];

      if (capturesRes.data) {
        const cards = capturesRes.data.map((c: any) => ({
          id: c.id, name: c.animal_name, scientificName: c.scientific_name || '',
          image: c.image_url, subjectBox: c.subject_bbox, rarity: c.rarity as Rarity, category: c.category || '',
          description: c.description || '', habitat: c.habitat || '', diet: c.diet || '',
          conservation: c.conservation || '', funFact: c.fun_fact || '',
          discoveredAt: c.created_at, location: c.location || '',
        }));
        resolvedCaptureCards = cards;
        setAllCaptures(cards);
        setAllCapturedNames(cards.map(c => c.name));

        const counts: Record<string, number> = {};
        cards.forEach((c) => { counts[c.rarity] = (counts[c.rarity] || 0) + 1; });
        setRarityCounts(counts);
      }

      if (questsRes.data) {
        const quests = questsRes.data;
        setQuestSummary({
          total: quests.length,
          completed: quests.filter((q: any) => q.completed).length,
          claimable: quests.filter((q: any) => q.completed && !q.claimed).length,
        });
      }

      setUnreadCount(notifRes.count || 0);

      // Calculate streak (consecutive days with captures)
      const { data: streakData } = await supabase
        .from('captures')
        .select('created_at')
        .eq('user_id', uid)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (streakData && streakData.length > 0) {
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const captureDays = new Set(
          streakData.map((c: any) => {
            const d = new Date(c.created_at);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          })
        );

        const sortedDays = [...captureDays].sort((a, b) => b - a);
        
        // Check if today or yesterday has a capture
        const todayTime = today.getTime();
        const yesterdayTime = todayTime - 86400000;
        
        if (sortedDays[0] === todayTime || sortedDays[0] === yesterdayTime) {
          let checkDate = sortedDays[0];
          for (const day of sortedDays) {
            if (day === checkDate) {
              currentStreak++;
              checkDate -= 86400000;
            } else break;
          }
        }
        setStreak(currentStreak);
      }

      // Check for earned-but-unclaimed badges and create notifications
      if (capturesRes.data && profileRes.data) {
        await checkBadgeNotifications(uid, resolvedCaptureCards as any[], profileRes.data as any);
      }

      setLoading(false);
    };

    fetchAll();

    const channel = supabase
      .channel('home-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => {
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false).then(({ count }) => setUnreadCount(count || 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  if (loading || !profile) {
    return <LoadingScreen />;
  }

  const xpPercent = Math.round((profile.xp / profile.xp_to_next) * 100);
  const firstName = (profile.display_name || profile.username || 'Explorateur').split(' ')[0];

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      {/* Immersive Header */}
      <PageHeader className="relative z-40 bg-gradient-to-b from-primary/15 via-primary/5 to-background px-5 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/profile')} className="relative w-12 h-12 rounded-full border-2 border-primary/40 overflow-hidden shrink-0 game-avatar-ring cursor-pointer">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              <div>
                <h1 className="text-lg font-display font-black text-foreground leading-tight">{firstName}</h1>
                <p className="text-[10px] text-muted-foreground font-display flex items-center gap-1">
                  Explorateur
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber/15 border border-amber/20 text-amber">
                      <Flame className="w-2.5 h-2.5" />
                      <span className="font-bold">{streak}j</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center game-notif-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* XP Bar — light */}
          {!isFirstTime && (
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-display font-bold text-primary shrink-0">Niv. {profile.level}</span>
              <div className="relative flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-amber transition-all duration-1000 ease-out game-xp-glow"
                  style={{ width: `${xpPercent}%` }}
                />
                <div className="absolute inset-0 game-xp-shimmer pointer-events-none" />
              </div>
              <span className="text-[10px] font-display text-muted-foreground shrink-0">{profile.xp}/{profile.xp_to_next}</span>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="max-w-lg mx-auto px-4 pt-3 space-y-4 pb-24">

        {/* Quêtes de la semaine — explosive gaming card */}
        {!isFirstTime && (
        <button
          onClick={() => navigate('/quests')}
          className="w-full relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/10 via-amber/15 to-amber-dark/10 hover:from-amber/15 hover:to-amber-dark/15 transition-all text-left group active:scale-[0.97] transform shadow-[0_0_20px_hsla(42,80%,55%,0.15)] hover:shadow-[0_0_30px_hsla(42,80%,55%,0.25)]"
        >
          {/* Sunburst rays background */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="quest-sunburst" />
          </div>
          
          {/* Icon container */}
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber/25 to-amber-dark/20 border border-amber/30 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 text-amber relative z-10" />
          </div>
          
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-sm font-display font-bold text-foreground">Quêtes de la semaine</h3>
              {questSummary.claimable > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber to-amber-light text-white text-[10px] font-display font-bold quest-claim-pulse flex items-center gap-1 shadow-[0_0_12px_hsla(42,80%,55%,0.5)]">
                  🎁 {questSummary.claimable} récompense{questSummary.claimable > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mb-1.5">{questSummary.completed}/{questSummary.total} terminées</p>
            <div className="flex gap-1">
              {Array.from({ length: questSummary.total }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i < questSummary.completed 
                    ? 'bg-gradient-to-r from-amber to-amber-light shadow-[0_0_8px_hsla(42,85%,55%,0.5)]' 
                    : 'bg-muted/60'
                }`} style={{ transitionDelay: `${i * 100}ms` }} />
              ))}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber/60 shrink-0 group-hover:translate-x-1 group-hover:text-amber transition-all" />
        </button>
        )}

        {/* Autour de moi */}
        <NearbyAnimalsSection capturedNames={allCapturedNames} />

        {/* Progression personnelle */}
        {allCaptures.length > 0 && (() => {
          const rarityTiles: { key: Rarity; label: string; dot: string; ring: string }[] = [
            { key: 'common', label: 'Commun', dot: 'bg-rarity-common', ring: 'border-rarity-common/30' },
            { key: 'rare', label: 'Rare', dot: 'bg-rarity-rare', ring: 'border-rarity-rare/30' },
            { key: 'epic', label: 'Épique', dot: 'bg-rarity-epic', ring: 'border-rarity-epic/30' },
            { key: 'mythic', label: 'Mythique', dot: 'bg-rarity-mythic', ring: 'border-rarity-mythic/30' },
          ];

          // Categories breakdown (top 3)
          const catMap: Record<string, number> = {};
          allCaptures.forEach(c => { if (c.category) catMap[c.category] = (catMap[c.category] || 0) + 1; });
          const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

          // Next badges to unlock
          const total = allCaptures.length;
          const birds = allCaptures.filter(c => c.category?.toLowerCase().includes('oiseau')).length;
          const mammals = allCaptures.filter(c => c.category?.toLowerCase().includes('mammif')).length;
          const progressOf = (b: typeof BADGE_DEFS[number]) => {
            switch (b.type) {
              case 'captures': return Math.min(total, b.total);
              case 'birds': return Math.min(birds, b.total);
              case 'mammals': return Math.min(mammals, b.total);
              case 'rare': return rarityCounts.rare || rarityCounts.epic || rarityCounts.mythic ? 1 : 0;
              case 'epic': return rarityCounts.epic || rarityCounts.mythic ? 1 : 0;
              case 'mythic': return rarityCounts.mythic ? 1 : 0;
              case 'level': return Math.min(profile.level, b.total);
              default: return 0;
            }
          };
          const BADGE_LABELS: Record<string, string> = {
            first_capture: 'Première capture', explorer_10: 'Explorateur · 10', explorer_25: 'Explorateur · 25',
            explorer_50: 'Explorateur · 50', birds_5: 'Ornithologue', mammals_5: 'Mammalogiste',
            rare_1: 'Première rare', legendary_1: 'Première épique', mythic_1: 'Première mythique',
            social_3: 'Sociable', level_5: 'Niveau 5',
          };
          const nextBadges = BADGE_DEFS
            .map(b => ({ ...b, current: progressOf(b), pct: progressOf(b) / b.total }))
            .filter(b => b.pct < 1)
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 3);

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber" />
                <h2 className="text-base font-display font-bold text-foreground">Ta progression</h2>
              </div>

              {/* Rarity tiles */}
              <div className="grid grid-cols-4 gap-2">
                {rarityTiles.map(t => (
                  <div key={t.key} className={`relative p-2.5 rounded-xl border ${t.ring} bg-card/60 flex flex-col items-center gap-1`}>
                    <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                    <span className="text-lg font-display font-black text-foreground tabular-nums leading-none">{rarityCounts[t.key] || 0}</span>
                    <span className="text-[9px] font-display text-muted-foreground uppercase tracking-wide">{t.label}</span>
                  </div>
                ))}
              </div>

              {/* Catégories */}
              {topCats.length > 0 && (
                <button
                  onClick={() => navigate('/bestiaire')}
                  className="w-full p-3.5 rounded-2xl border border-border bg-card/60 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-display font-bold text-foreground">Catégories explorées</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    {topCats.map(([cat, count]) => {
                      const pct = Math.min(100, (count / total) * 100);
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-display text-foreground">{cat}</span>
                            <span className="text-[10px] font-display text-muted-foreground tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </button>
              )}

              {/* Prochains badges */}
              {nextBadges.length > 0 && (
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full p-3.5 rounded-2xl border border-amber/25 bg-gradient-to-br from-amber/8 to-transparent text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber" />
                      <h3 className="text-sm font-display font-bold text-foreground">Prochains badges</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2.5">
                    {nextBadges.map(b => {
                      const pct = Math.round(b.pct * 100);
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-display text-foreground">{BADGE_LABELS[b.id] || b.id}</span>
                            <span className="text-[10px] font-display text-muted-foreground tabular-nums">{b.current}/{b.total}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber to-amber-light transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </button>
              )}

              {/* Lien vers la collection complète */}
              <button
                onClick={() => navigate('/bestiaire')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-border bg-card/60 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-display font-bold text-foreground">Voir ma collection</p>
                    <p className="text-[10px] font-display text-muted-foreground">{allCaptures.length} capture{allCaptures.length > 1 ? 's' : ''} dans ton Faunex</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          );
        })()}

        {/* Empty state */}
        {allCaptures.length === 0 && !loading && (
          <div className="text-center py-16 px-6">
            <div className="text-6xl mb-4 game-float">🌿</div>
            <h3 className="text-foreground font-display font-bold text-lg mb-2">Commence ton aventure !</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto mb-6">
              Photographie les animaux autour de toi pour les identifier et les ajouter à ta collection.
            </p>
            <button
              onClick={() => navigate('/capture')}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm shadow-[0_4px_15px_hsla(var(--primary),0.3)] hover:shadow-[0_6px_20px_hsla(var(--primary),0.4)] transition-shadow active:scale-[0.97] transform"
            >
              📸 Ma première capture
            </button>
          </div>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
      <WelcomeInstallPopup />
      <DailyQuestPopup />
    </main>
  );
};

export default Index;
