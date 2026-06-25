import { useState, useEffect } from 'react';
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
import { startOfWeekISO } from '@/lib/weekUtils';
import type { AnimalCard } from '@/data/mockData';

interface Profile {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  xp_to_next: number;
  species_count: number;
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
        supabase.from('profiles').select('display_name, username, avatar_url, level, xp, xp_to_next, species_count, total_captures').eq('user_id', uid).single(),
        supabase.from('captures').select('*').eq('user_id', uid).eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('daily_quests').select('completed, claimed').eq('user_id', uid).eq('quest_date', startOfWeekISO()),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      
      if (capturesRes.data) {
        // Get latest rarity from animals table (capture.rarity is a snapshot at capture time)
        const uniqueNames = Array.from(new Set(capturesRes.data.map((c: any) => c.animal_name).filter(Boolean)));
        const rarityByName: Record<string, string> = {};
        if (uniqueNames.length) {
          const { data: animalsData } = await supabase
            .from('animals')
            .select('name, rarity')
            .in('name', uniqueNames);
          (animalsData || []).forEach((a: any) => { rarityByName[a.name.toLowerCase()] = a.rarity; });
        }
        const resolveRarity = (c: any): Rarity => (rarityByName[(c.animal_name || '').toLowerCase()] || c.rarity) as Rarity;

        const cards = capturesRes.data.map((c: any) => ({
          id: c.id, name: c.animal_name, scientificName: c.scientific_name || '',
          image: c.image_url, cutoutUrl: c.cutout_url, rarity: resolveRarity(c), category: c.category || '',
          description: c.description || '', habitat: c.habitat || '', diet: c.diet || '',
          conservation: c.conservation || '', funFact: c.fun_fact || '',
          discoveredAt: c.created_at, location: c.location || '',
        }));
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
        await checkBadgeNotifications(uid, capturesRes.data as any[], profileRes.data as any);
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
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <img src="/pwa-icon-512.png" alt="Logo Faunex" className="w-16 h-16 animate-pulse" />
        <span className="text-muted-foreground font-display text-sm">Chargement…</span>
      </main>
    );
  }

  const xpPercent = Math.round((profile.xp / profile.xp_to_next) * 100);
  const firstName = (profile.display_name || profile.username || 'Explorateur').split(' ')[0];

  return (
    <main className="relative min-h-screen bg-background pb-24 overflow-hidden">
      {/* Immersive backdrop — nocturnal forest glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full bg-rarity-epic/15 blur-3xl" />
        <div className="absolute top-40 left-1/3 w-[280px] h-[280px] rounded-full bg-amber/10 blur-3xl" />
      </div>

      {/* Hero */}
      <header className="relative z-10 px-5 pt-5 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/profile')} className="relative w-12 h-12 rounded-full border-2 border-primary/50 overflow-hidden shrink-0 game-avatar-ring cursor-pointer shadow-[0_0_24px_hsla(var(--primary),0.35)]">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-display text-muted-foreground">Explorateur</p>
                <h1 className="text-xl font-display font-black text-foreground leading-tight">{firstName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber/15 border border-amber/30 text-amber shadow-[0_0_16px_hsla(42,85%,55%,0.25)]">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-display font-bold tabular-nums">{streak}j</span>
                </span>
              )}
              <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full border border-border bg-card/60 backdrop-blur hover:bg-card transition-colors">
                <Bell className="w-4 h-4 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center game-notif-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Level hero card */}
          {!isFirstTime && (
            <div className="relative rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 via-card/70 to-card/40 backdrop-blur-xl p-5 overflow-hidden shadow-[0_8px_40px_hsla(var(--primary),0.18)]">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-amber/15 blur-3xl pointer-events-none" />

              <div className="relative flex items-end justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-display text-primary/80 mb-1">Niveau actuel</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-display font-black text-foreground leading-none tabular-nums drop-shadow-[0_0_18px_hsla(var(--primary),0.5)]">
                      {profile.level}
                    </span>
                    <span className="text-xs font-display text-muted-foreground">/ Niv. {profile.level + 1}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-display text-muted-foreground">XP</p>
                  <p className="text-sm font-display font-bold text-foreground tabular-nums">
                    {profile.xp}<span className="text-muted-foreground">/{profile.xp_to_next}</span>
                  </p>
                </div>
              </div>

              <div className="relative h-2.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-amber transition-all duration-1000 ease-out game-xp-glow shadow-[0_0_18px_hsla(var(--primary),0.7)]"
                  style={{ width: `${xpPercent}%` }}
                />
                <div className="absolute inset-0 game-xp-shimmer pointer-events-none" />
              </div>

              <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-base font-display font-black text-foreground tabular-nums leading-none">{profile.total_captures}</p>
                  <p className="text-[9px] uppercase tracking-wide font-display text-muted-foreground mt-1">Captures</p>
                </div>
                <div className="border-x border-border/40">
                  <p className="text-base font-display font-black text-foreground tabular-nums leading-none">{profile.species_count}</p>
                  <p className="text-[9px] uppercase tracking-wide font-display text-muted-foreground mt-1">Espèces</p>
                </div>
                <div>
                  <p className="text-base font-display font-black text-amber tabular-nums leading-none">{questSummary.claimable}</p>
                  <p className="text-[9px] uppercase tracking-wide font-display text-muted-foreground mt-1">À récolter</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 space-y-4 pb-24">

        {/* Rarity gems — bento row */}
        {allCaptures.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber" />
                <h2 className="text-[11px] uppercase tracking-[0.18em] font-display font-bold text-foreground">Collection</h2>
              </div>
              <button onClick={() => navigate('/bestiaire')} className="text-[11px] font-display text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                Tout voir <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: 'common' as Rarity, label: 'Commun', dotClass: 'bg-rarity-common', glow: 'shadow-[0_0_18px_hsla(0,0%,60%,0.25)]', ring: 'border-rarity-common/35' },
                { key: 'rare' as Rarity, label: 'Rare', dotClass: 'bg-rarity-rare', glow: 'shadow-[0_0_22px_hsla(210,90%,60%,0.35)]', ring: 'border-rarity-rare/40' },
                { key: 'epic' as Rarity, label: 'Épique', dotClass: 'bg-rarity-epic', glow: 'shadow-[0_0_24px_hsla(270,75%,65%,0.4)]', ring: 'border-rarity-epic/45' },
                { key: 'mythic' as Rarity, label: 'Mythique', dotClass: 'bg-rarity-mythic', glow: 'shadow-[0_0_28px_hsla(42,85%,60%,0.45)]', ring: 'border-rarity-mythic/50' },
              ]).map(t => {
                const count = rarityCounts[t.key] || 0;
                return (
                  <div key={t.key} className={`relative rounded-2xl border ${t.ring} bg-card/70 backdrop-blur p-2.5 flex flex-col items-center justify-center gap-1 aspect-square ${count > 0 ? t.glow : 'opacity-60'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${t.dotClass} ${count > 0 ? 'animate-pulse' : ''}`} />
                    <span className="text-xl font-display font-black text-foreground tabular-nums leading-none">{count}</span>
                    <span className="text-[8.5px] font-display text-muted-foreground uppercase tracking-wider">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quêtes — explosive gaming card */}
        {!isFirstTime && (
          <button
            onClick={() => navigate('/quests')}
            className="w-full relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border border-amber/35 bg-gradient-to-br from-amber/15 via-amber/10 to-amber-dark/15 hover:from-amber/20 transition-all text-left group active:scale-[0.97] transform shadow-[0_0_24px_hsla(42,80%,55%,0.18)]"
          >
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="quest-sunburst" />
            </div>
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber/30 to-amber-dark/25 border border-amber/40 flex items-center justify-center shrink-0 shadow-[inset_0_0_12px_hsla(42,90%,60%,0.3)]">
              <Target className="w-6 h-6 text-amber relative z-10" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="text-sm font-display font-bold text-foreground">Quêtes de la semaine</h3>
                {questSummary.claimable > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber to-amber-light text-white text-[10px] font-display font-bold quest-claim-pulse flex items-center gap-1 shadow-[0_0_12px_hsla(42,80%,55%,0.5)]">
                    🎁 {questSummary.claimable}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mb-1.5 font-display">{questSummary.completed}/{questSummary.total} terminées</p>
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
            <ChevronRight className="w-4 h-4 text-amber/70 shrink-0 group-hover:translate-x-1 transition-all" />
          </button>
        )}

        {/* Capture CTA + Radar bento */}
        <div className="grid grid-cols-5 gap-3">
          <button
            onClick={() => navigate('/capture')}
            className="col-span-2 relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/25 via-primary/15 to-transparent p-4 flex flex-col items-start justify-between aspect-square active:scale-[0.97] transition-transform shadow-[0_0_28px_hsla(var(--primary),0.25)]"
          >
            <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/30 blur-2xl pointer-events-none" />
            <div className="relative w-11 h-11 rounded-xl bg-primary/25 border border-primary/40 flex items-center justify-center shadow-[inset_0_0_14px_hsla(var(--primary),0.35)]">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div className="relative text-left">
              <p className="text-[10px] uppercase tracking-[0.16em] font-display text-primary/90 mb-0.5">Capture</p>
              <p className="text-sm font-display font-black text-foreground leading-tight">Pars en<br/>chasse</p>
            </div>
          </button>
          <div className="col-span-3 rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden">
            <NearbyAnimalsSection capturedNames={allCapturedNames} />
          </div>
        </div>

        {/* Progression personnelle */}
        {allCaptures.length > 0 && (() => {
          const catMap: Record<string, number> = {};
          allCaptures.forEach(c => { if (c.category) catMap[c.category] = (catMap[c.category] || 0) + 1; });
          const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

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
            <div className="grid grid-cols-2 gap-3">
              {topCats.length > 0 && (
                <button
                  onClick={() => navigate('/bestiaire')}
                  className="col-span-2 relative overflow-hidden p-4 rounded-2xl border border-border bg-card/60 backdrop-blur text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h3 className="text-[11px] uppercase tracking-[0.16em] font-display font-bold text-foreground">Catégories explorées</h3>
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
                          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/50 shadow-[0_0_8px_hsla(var(--primary),0.4)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </button>
              )}

              {nextBadges.length > 0 && (
                <button
                  onClick={() => navigate('/profile')}
                  className="col-span-2 relative overflow-hidden p-4 rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/12 via-card/60 to-transparent backdrop-blur text-left active:scale-[0.98] transition-transform"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber/15 blur-2xl pointer-events-none" />
                  <div className="relative flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber" />
                      <h3 className="text-[11px] uppercase tracking-[0.16em] font-display font-bold text-foreground">Prochains trophées</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="relative space-y-2.5">
                    {nextBadges.map(b => {
                      const pct = Math.round(b.pct * 100);
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-display text-foreground">{BADGE_LABELS[b.id] || b.id}</span>
                            <span className="text-[10px] font-display text-muted-foreground tabular-nums">{b.current}/{b.total}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber to-amber-light shadow-[0_0_10px_hsla(42,85%,55%,0.55)] transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </button>
              )}
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
