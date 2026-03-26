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
        setRecentCaptures(cards);

        // Count by rarity
        const counts: Record<string, number> = {};
        capturesRes.data.forEach((c: any) => { counts[c.rarity] = (counts[c.rarity] || 0) + 1; });
      }

      // Get full rarity counts
      const { data: allCaptures } = await supabase.from('captures').select('rarity, animal_name').eq('user_id', uid).eq('status', 'approved');
      if (allCaptures) {
        const counts: Record<string, number> = {};
        allCaptures.forEach((c: any) => { counts[c.rarity] = (counts[c.rarity] || 0) + 1; });
        setRarityCounts(counts);
        setAllCapturedNames(allCaptures.map((c: any) => c.animal_name));
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
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/30 overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-display font-bold text-primary">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-foreground leading-tight">Salut {firstName} 👋</h1>
              <p className="text-[10px] text-muted-foreground font-display">Prêt pour l'aventure ?</p>
            </div>
          </div>
          <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Hero Stats Card */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-amber/5 p-5">
          {/* Level & XP row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center level-splash-badge shrink-0">
              <span className="text-lg font-display font-black text-primary">{profile.level}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-display font-bold text-foreground">Niveau {profile.level}</p>
                <div className="flex items-center gap-2">
                  {streak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber/10 border border-amber/20">
                      <Flame className="w-3 h-3 text-amber" />
                      <span className="text-[10px] font-display font-bold text-amber">{streak}j</span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground font-display">{profile.xp}/{profile.xp_to_next} XP</p>
                </div>
              </div>
              <Progress value={xpPercent} className="h-2 bg-muted/50 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-amber" />
            </div>
          </div>

          {/* Inline stats */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-display font-black text-foreground">{profile.species_count}</span>
              <span className="text-[10px] text-muted-foreground font-display">espèces</span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <span className="text-base font-display font-black text-foreground">{profile.total_captures}</span>
              <span className="text-[10px] text-muted-foreground font-display">captures</span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex items-center gap-1">
              {RARITY_ORDER.map(r => (
                rarityCounts[r] ? (
                  <span key={r} className={`text-[9px] font-display font-bold px-1.5 py-0.5 rounded ${
                    r === 'mythic' ? 'text-rarity-mythic bg-rarity-mythic/10' :
                    r === 'epic' ? 'text-rarity-epic bg-rarity-epic/10' :
                    r === 'rare' ? 'text-rarity-rare bg-rarity-rare/10' :
                    'text-rarity-common bg-rarity-common/10'
                  }`}>
                    {rarityCounts[r]}
                  </span>
                ) : null
              ))}
            </div>
          </div>
        </div>

        {/* CTA Capture */}
        <button
          onClick={() => navigate('/capture')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.98] transform"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-base font-display font-bold">Nouvelle capture</h3>
            <p className="text-xs opacity-80">Photographie une espèce pour l'identifier</p>
          </div>
          <Zap className="w-5 h-5 opacity-60" />
        </button>

        {/* Action Cards Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Quests Card */}
          <button
            onClick={() => navigate('/quests')}
            className="relative overflow-hidden flex flex-col gap-2 p-4 rounded-2xl border border-amber/20 bg-amber/5 hover:bg-amber/10 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-amber" />
              </div>
              {questSummary.claimable > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber text-white text-[10px] font-display font-bold quest-claim-pulse">
                  {questSummary.claimable} 🎁
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-foreground">Quêtes</h3>
              <p className="text-[10px] text-muted-foreground">
                {questSummary.completed}/{questSummary.total} terminées
              </p>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1">
              {Array.from({ length: questSummary.total }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < questSummary.completed ? 'bg-amber' : 'bg-muted'}`} />
              ))}
            </div>
          </button>

          {/* Collection Card */}
          <button
            onClick={() => navigate('/collection')}
            className="relative flex flex-col gap-2 p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-foreground">Collection</h3>
              <p className="text-[10px] text-muted-foreground">{profile.species_count} espèces collectées</p>
            </div>
            <div className="flex gap-1">
              {RARITY_ORDER.map(r => (
                rarityCounts[r] ? (
                  <span key={r} className={`text-[9px] font-display font-bold px-1 rounded ${
                    r === 'mythic' ? 'text-rarity-mythic' :
                    r === 'epic' ? 'text-rarity-epic' :
                    r === 'rare' ? 'text-rarity-rare' : 'text-rarity-common'
                  }`}>
                    {rarityCounts[r]} {RARITY_LABELS[r]}
                  </span>
                ) : null
              ))}
            </div>
          </button>

          {/* Explorateurs Card */}
          <button
            onClick={() => navigate('/explorers')}
            className="relative flex flex-col gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Users className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-foreground">Explorateurs</h3>
              <p className="text-[10px] text-muted-foreground">Amis & communauté</p>
            </div>
          </button>
        </div>

        {/* Autour de moi */}
        <NearbyAnimalsSection capturedNames={allCapturedNames} />

        {/* All Captures */}
        {allCaptures.length > 0 && (
          <div>
            <h2 className="text-base font-display font-bold text-foreground mb-3">Ma collection</h2>
            <div className="grid grid-cols-2 gap-3">
              {allCaptures.map((card, i) => (
                <div key={card.id} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                  <AnimalCardComponent card={card} compact onClick={() => setSelectedCard(card)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {allCaptures.length === 0 && !loading && (
          <div className="text-center py-12 px-6">
            <div className="text-5xl mb-4">🌿</div>
            <h3 className="text-foreground font-display font-bold text-base mb-2">Commence ton aventure !</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto mb-5">
              Photographie les animaux autour de toi pour les identifier et les ajouter à ta collection.
            </p>
            <button
              onClick={() => navigate('/capture')}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm"
            >
              📸 Ma première capture
            </button>
          </div>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default Index;
