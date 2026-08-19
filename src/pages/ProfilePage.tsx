import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Settings, Award, MapPin, BookOpen, Lock, Download, Bell, Gift, Users, UserPlus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import XpParticles from '@/components/XpParticles';
import QuestsInline from '@/components/QuestsInline';
import DiscordInviteCard, { COMMUNITY_BADGE_ID, COMMUNITY_BADGE_XP } from '@/components/DiscordInviteCard';


interface Profile {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  xp_to_next: number;
  total_captures: number;
  regions_explored: number;
}




const ProfilePage = () => {
  const { session } = useAuth();
  const { canInstall, isInstalled, isNative, promptInstall } = usePwaInstall();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showXpParticles, setShowXpParticles] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (cancelled || !role) return;
      setIsAdmin(true);
      const { count } = await supabase
        .from('captures')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');
      if (!cancelled) setPendingCount(count || 0);
    })();
    return () => { cancelled = true; };
  }, [session]);


  useEffect(() => {
    if (window.location.hash === '#badges') {
      setTimeout(() => {
        document.getElementById('badges')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [loading]);

  useEffect(() => {
    if (!session?.user) return;
    const fetchAll = async () => {
      setLoading(true);
      const userId = session.user.id;

      const [profileRes, followersRes, followingRes, capturesRes, claimedBadgesRes] = await Promise.all([
        supabase.from('profiles').select('display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored').eq('user_id', userId).single(),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('captures').select('category, rarity').eq('user_id', userId),
        supabase.from('user_badges').select('badge_id').eq('user_id', userId),
      ]);

      const data = profileRes.data;
      if (data) {
        setProfile(data as Profile);
      }

      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      const fCount = followingRes.count || 0;

      const captures = capturesRes.data || [];
      const totalCaptures = captures.length;


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
        [COMMUNITY_BADGE_ID]: claimedSet.has(COMMUNITY_BADGE_ID) ? 1 : 0,
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
  }, [session, refreshKey]);


  const [claiming, setClaiming] = useState<string | null>(null);
  const [showXpParticles, setShowXpParticles] = useState(false);

  const claimBadge = useCallback(async (badgeId: string) => {
    if (!session?.user || claiming) return;
    setClaiming(badgeId);
    const xpReward = BADGE_XP_REWARDS[badgeId] || 50;

    const { data: claimed, error } = await supabase.rpc('claim_badge', {
      p_badge_id: badgeId,
      p_xp_reward: xpReward,
    });

    if (!error && claimed) {
      setBadges(prev => prev.map(b => b.badge.id === badgeId ? { ...b, claimed: true } : b));

      // Show XP particles
      setShowXpParticles(true);

      const { data: refreshed } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored')
        .eq('user_id', session.user.id)
        .single();
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
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
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
      </PageHeader>

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
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<BookOpen className="w-5 h-5 text-primary" />} value={profile.total_captures} label="Espèces" />
          <StatCard icon={<MapPin className="w-5 h-5 text-sky" />} value={profile.regions_explored} label="Régions" />
          <StatCard icon={<Users className="w-5 h-5 text-amber" />} value={followersCount} label="Abonnés" />
          <StatCard icon={<UserPlus className="w-5 h-5 text-emerald" />} value={followingCount} label="Abonnements" />
        </div>

        {/* PWA Install Card */}
        {!isNative && canInstall && !isInstalled && (
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

        {/* Admin moderation access */}
        {isAdmin && (
          <button
            onClick={() => navigate('/moderation')}
            className="w-full bg-amber/10 border border-amber/30 rounded-xl p-4 flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-display font-semibold text-foreground">Modération</p>
              <p className="text-xs text-muted-foreground">
                {pendingCount > 0
                  ? `${pendingCount} capture${pendingCount > 1 ? 's' : ''} en attente de validation`
                  : 'Aucune capture en attente'}
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber text-amber-dark text-xs font-display font-bold shrink-0">
                {pendingCount}
              </span>
            )}
          </button>
        )}

        {/* Quests Section */}
        <QuestsInline />

        {/* Discord Community Invitation */}
        <DiscordInviteCard onBadgeEarned={() => setRefreshKey(k => k + 1)} />

        {/* Badges Section — Gaming Style */}
        <BadgesSection
          userId={session!.user.id}
          level={profile.level}
          regionsExplored={profile.regions_explored}
          refreshKey={refreshKey}
          onClaimed={handleBadgeClaimed}
        />


      </div>
    </main>
    </>
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
