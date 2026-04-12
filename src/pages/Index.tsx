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
import WelcomeInstallPopup from '@/components/WelcomeInstallPopup';
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

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;

    const fetchAll = async () => {
      const [profileRes, capturesRes, questsRes, notifRes] = await Promise.all([
        supabase.from('profiles').select('display_name, username, avatar_url, level, xp, xp_to_next, species_count, total_captures').eq('user_id', uid).single(),
        supabase.from('captures').select('*').eq('user_id', uid).eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('daily_quests').select('completed, claimed').eq('user_id', uid).eq('quest_date', new Date().toISOString().split('T')[0]),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      
      if (capturesRes.data) {
        const cards = capturesRes.data.map((c: any) => ({
          id: c.id, name: c.animal_name, scientificName: c.scientific_name || '',
          image: c.image_url, rarity: c.rarity as Rarity, category: c.category || '',
          description: c.description || '', habitat: c.habitat || '', diet: c.diet || '',
          conservation: c.conservation || '', funFact: c.fun_fact || '',
          discoveredAt: c.created_at, location: c.location || '',
        }));
        setAllCaptures(cards);
        setAllCapturedNames(cards.map(c => c.name));

        const counts: Record<string, number> = {};
        capturesRes.data.forEach((c: any) => { counts[c.rarity] = (counts[c.rarity] || 0) + 1; });
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
        <img src="/pwa-icon-512.png" alt="Faunex" className="w-16 h-16 animate-pulse" />
        <span className="text-muted-foreground font-display text-sm">Chargement…</span>
      </main>
    );
  }

  const xpPercent = Math.round((profile.xp / profile.xp_to_next) * 100);
  const firstName = (profile.display_name || profile.username || 'Explorateur').split(' ')[0];

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      {/* Immersive Header */}
      <header className="relative z-40 bg-gradient-to-b from-primary/15 via-primary/5 to-background px-5 pt-4 pb-6">
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
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-3 space-y-4 pb-24">

        {/* Quêtes du jour — explosive gaming card */}
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
              <h3 className="text-sm font-display font-bold text-foreground">Quêtes du jour</h3>
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

        {/* Autour de moi */}
        <NearbyAnimalsSection capturedNames={allCapturedNames} />

        {/* Collection */}
        {allCaptures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-display font-bold text-foreground">Ma collection</h2>
              <span className="text-[10px] font-display font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{allCaptures.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {allCaptures.map((card, i) => (
                <div key={card.id} className="game-card-appear" style={{ animationDelay: `${Math.min(i, 8) * 80}ms` }}>
                  <AnimalCardComponent card={card} compact onClick={() => setSelectedCard(card)} />
                </div>
              ))}
            </div>
          </div>
        )}

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
