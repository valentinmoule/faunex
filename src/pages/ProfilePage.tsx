import { useState, useEffect, useCallback } from 'react';
import { Settings, Award, MapPin, Camera as CameraIcon, BookOpen, Lock, Download, Bell, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import XpParticles from '@/components/XpParticles';


interface Profile {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  xp_to_next: number;
  species_count: number;
  total_captures: number;
  regions_explored: number;
}

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  total: number;
}

const BADGE_DEFS: BadgeDef[] = [
  { id: 'first_capture', name: 'Première capture', icon: '📸', description: 'Capturer ton premier animal', total: 1 },
  { id: 'explorer_10', name: 'Explorateur', icon: '🧭', description: 'Découvrir 10 espèces', total: 10 },
  { id: 'explorer_25', name: 'Naturaliste', icon: '🌿', description: 'Découvrir 25 espèces', total: 25 },
  { id: 'explorer_50', name: 'Expert faune', icon: '🔬', description: 'Découvrir 50 espèces', total: 50 },
  { id: 'birds_5', name: 'Ornithologue', icon: '🐦', description: 'Capturer 5 oiseaux', total: 5 },
  { id: 'mammals_5', name: 'Mammalogiste', icon: '🦊', description: 'Capturer 5 mammifères', total: 5 },
  { id: 'rare_1', name: 'Chasseur rare', icon: '💎', description: 'Trouver un animal rare ou mieux', total: 1 },
  { id: 'legendary_1', name: 'Légende vivante', icon: '⭐', description: 'Trouver un animal épique', total: 1 },
  { id: 'mythic_1', name: 'Mythique !', icon: '🔥', description: 'Trouver un animal mythique', total: 1 },
  { id: 'social_3', name: 'Sociable', icon: '🤝', description: 'Suivre 3 explorateurs', total: 3 },
  { id: 'level_5', name: 'Niveau 5', icon: '🏅', description: 'Atteindre le niveau 5', total: 5 },
];

const BADGE_XP_REWARDS: Record<string, number> = {
  first_capture: 50,
  explorer_10: 100,
  explorer_25: 200,
  explorer_50: 500,
  birds_5: 100,
  mammals_5: 100,
  rare_1: 150,
  legendary_1: 300,
  mythic_1: 500,
  social_3: 75,
  level_5: 150,
};

interface BadgeProgress {
  badge: BadgeDef;
  progress: number;
  earned: boolean;
  claimed: boolean;
}

const ProfilePage = () => {
  const { session } = useAuth();
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [badges, setBadges] = useState<BadgeProgress[]>([]);

  useEffect(() => {
    if (!session?.user) return;
    const fetchAll = async () => {
      setLoading(true);
      const userId = session.user.id;

      const [profileRes, friendsRes, capturesRes, claimedBadgesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('captures').select('category, rarity').eq('user_id', userId),
        supabase.from('user_badges').select('badge_id').eq('user_id', userId),
      ]);

      const data = profileRes.data;
      if (data) {
        setProfile(data as Profile);
      }

      const fCount = friendsRes.count || 0;
      setFriendsCount(fCount);

      const captures = capturesRes.data || [];
      const totalCaptures = captures.length;

      if (data && data.total_captures !== totalCaptures) {
        await supabase.from('profiles').update({ total_captures: totalCaptures, species_count: totalCaptures }).eq('user_id', userId);
        setProfile(prev => prev ? { ...prev, total_captures: totalCaptures, species_count: totalCaptures } : prev);
      }

      const claimedSet = new Set((claimedBadgesRes.data || []).map((b: any) => b.badge_id));

      const birdCount = captures.filter(c => c.category?.toLowerCase().includes('oiseau')).length;
      const mammalCount = captures.filter(c => c.category?.toLowerCase().includes('mammif')).length;
      const hasRare = captures.some(c => ['rare', 'epic', 'mythic'].includes(c.rarity));
      const hasLegendary = captures.some(c => ['epic', 'mythic'].includes(c.rarity));
      const hasMythic = captures.some(c => c.rarity === 'mythic');
      const level = data?.level || 1;

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
        social_3: Math.min(fCount, 3),
        level_5: Math.min(level, 5),
      };

      setBadges(BADGE_DEFS.map(b => ({
        badge: b,
        progress: progressMap[b.id] || 0,
        earned: (progressMap[b.id] || 0) >= b.total,
        claimed: claimedSet.has(b.id),
      })));

      setLoading(false);
    };
    fetchAll();
  }, [session]);


  const [claiming, setClaiming] = useState<string | null>(null);
  const [showXpParticles, setShowXpParticles] = useState(false);

  const claimBadge = useCallback(async (badgeId: string) => {
    if (!session?.user || claiming) return;
    setClaiming(badgeId);
    const xpReward = BADGE_XP_REWARDS[badgeId] || 50;
    
    const { error } = await supabase.from('user_badges').insert({
      user_id: session.user.id,
      badge_id: badgeId,
      xp_reward: xpReward,
    });

    if (!error) {
      await supabase.rpc('grant_xp', { p_user_id: session.user.id, p_amount: xpReward });
      setBadges(prev => prev.map(b => b.badge.id === badgeId ? { ...b, claimed: true } : b));
      
      // Show XP particles
      setShowXpParticles(true);
      
      const { data: refreshed } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();
      if (refreshed) setProfile(refreshed as Profile);
      
      toast.success(`Badge débloqué ! +${xpReward} XP 🎉`);
    }
    setClaiming(null);
  }, [session, claiming]);

  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-display">Chargement…</p>
      </main>
    );
  }

  const xpPercent = Math.round((profile.xp / profile.xp_to_next) * 100);
  const claimedCount = badges.filter(b => b.claimed).length;

  return (
    <>
    <XpParticles active={showXpParticles} onComplete={() => setShowXpParticles(false)} />
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-primary">Profil</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-muted transition-colors">
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-primary/30 overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{(profile.display_name || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-foreground">{profile.display_name || 'Sans nom'}</h2>
            <p className="text-sm text-muted-foreground">{profile.username || '@inconnu'}</p>
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-display font-semibold text-primary">Niv. {profile.level}</span>
                <span className="text-[10px] text-muted-foreground">{profile.xp}/{profile.xp_to_next} XP</span>
              </div>
              <Progress value={xpPercent} className="h-2 bg-muted [&>div]:bg-primary" />
            </div>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<BookOpen className="w-5 h-5 text-primary" />} value={profile.species_count} label="Espèces" />
          <StatCard icon={<CameraIcon className="w-5 h-5 text-amber" />} value={profile.total_captures} label="Captures" />
          <StatCard icon={<MapPin className="w-5 h-5 text-sky" />} value={profile.regions_explored} label="Régions" />
        </div>

        {/* PWA Install Card */}
        {canInstall && !isInstalled && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-display font-semibold text-foreground">Installer Faunex</p>
              <p className="text-xs text-muted-foreground">Accède à l'app depuis ton écran d'accueil</p>
            </div>
            <button
              onClick={promptInstall}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold shrink-0"
            >
              Installer
            </button>
          </div>
        )}

        {/* Badges Section — Gaming Style */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber/15 border border-amber/25 flex items-center justify-center">
                <Award className="w-4.5 h-4.5 text-amber" />
              </div>
              <h3 className="text-lg font-display font-black text-foreground">Badges</h3>
            </div>
            <span className="text-[11px] font-display font-semibold text-amber bg-amber/10 border border-amber/20 px-2.5 py-1 rounded-full">
              🏆 {claimedCount}/{badges.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {badges.map(({ badge, progress, earned, claimed }, i) => {
              const pct = Math.round((progress / badge.total) * 100);
              const readyToClaim = earned && !claimed;
              const xpReward = BADGE_XP_REWARDS[badge.id] || 50;
              return (
                <button
                  key={badge.id}
                  disabled={!readyToClaim || claiming === badge.id}
                  onClick={() => readyToClaim && claimBadge(badge.id)}
                  className={`relative rounded-2xl p-3.5 text-center transition-all duration-500 game-card-appear ${
                    claimed
                      ? 'bg-gradient-to-b from-amber/10 via-amber/5 to-card border-2 border-amber/40 shadow-[0_0_20px_hsla(42,85%,55%,0.15)] badge-earned-glow'
                      : readyToClaim
                      ? 'bg-gradient-to-b from-primary/10 via-primary/5 to-card border-2 border-primary/50 shadow-[0_0_20px_hsla(var(--primary)/0.2)] animate-pulse cursor-pointer active:scale-95'
                      : 'bg-card/80 border border-border/60 hover:border-border'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Claimed sparkle */}
                  {claimed && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber flex items-center justify-center shadow-[0_0_8px_hsla(42,85%,55%,0.5)] badge-sparkle">
                      <span className="text-[8px]">✓</span>
                    </div>
                  )}
                  {/* Ready to claim indicator */}
                  {readyToClaim && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_10px_hsla(var(--primary)/0.5)]">
                      <Gift className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  {/* Lock icon */}
                  {!earned && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-3 h-3 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Icon with glow ring */}
                  <div className={`relative mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all ${
                    claimed
                      ? 'bg-amber/15 border border-amber/30 shadow-[0_0_12px_hsla(42,85%,55%,0.2)]'
                      : readyToClaim
                      ? 'bg-primary/15 border border-primary/30 shadow-[0_0_12px_hsla(var(--primary)/0.2)]'
                      : 'bg-muted/60 border border-border/40'
                  }`}>
                    <span className={`text-2xl ${claimed ? 'badge-icon-float' : readyToClaim ? '' : 'grayscale opacity-40'}`}>{badge.icon}</span>
                  </div>
                  <p className={`text-[11px] font-display font-black leading-tight mb-0.5 ${claimed || readyToClaim ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {badge.name}
                  </p>
                  <p className={`text-[9px] leading-tight mb-2 ${claimed ? 'text-muted-foreground' : readyToClaim ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                    {badge.description}
                  </p>
                  {/* Progress bar */}
                  {!earned && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-muted/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[9px] font-display font-bold text-muted-foreground/70">{progress}/{badge.total}</p>
                    </div>
                  )}
                  {readyToClaim && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-display font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Gift className="w-2.5 h-2.5" /> +{xpReward} XP
                    </span>
                  )}
                  {claimed && (
                    <span className="inline-block text-[9px] font-display font-bold text-amber bg-amber/10 px-2 py-0.5 rounded-full">
                      Débloqué ✨
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="bg-card rounded-xl border border-border p-3 text-center shadow-card">
    <div className="flex justify-center mb-1.5">{icon}</div>
    <p className="text-xl font-display font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground font-display">{label}</p>
  </div>
);

export default ProfilePage;
