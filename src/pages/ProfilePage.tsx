import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Settings, MapPin, BookOpen, Download, Bell, Users, UserPlus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import XpParticles from '@/components/XpParticles';
import QuestsInline from '@/components/QuestsInline';
import DiscordInviteCard from '@/components/DiscordInviteCard';
import BadgesSection from '@/components/BadgesSection';


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
  const { isPremium } = useSubscription(session?.user?.id);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
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

      const [profileRes, followersRes, followingRes] = await Promise.all([
        supabase.from('profiles').select('display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored').eq('user_id', userId).single(),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);

      const data = profileRes.data;
      if (data) {
        setProfile(data as Profile);
      }

      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);

      setLoading(false);
    };
    fetchAll();
  }, [session, refreshKey]);

  const [showXpParticles, setShowXpParticles] = useState(false);

  /** After a badge claim: play the XP particles and refresh the profile XP/level. */
  const handleBadgeClaimed = useCallback(async () => {
    if (!session?.user) return;
    setShowXpParticles(true);
    const { data: refreshed } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored')
      .eq('user_id', session.user.id)
      .single();
    if (refreshed) setProfile(refreshed as Profile);
  }, [session]);

  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-display">Chargement…</p>
      </main>
    );
  }

  const xpPercent = Math.round((profile.xp / profile.xp_to_next) * 100);


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
          <PremiumAvatar
            avatarUrl={profile.avatar_url}
            name={profile.display_name}
            size="xl"
            isPremium={isPremium}
            className="border-2 border-primary/30 rounded-full"
          />
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
