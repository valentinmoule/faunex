import { useState, useEffect } from 'react';
import { Settings, Award, MapPin, Camera as CameraIcon, BookOpen, Lock, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaInstall } from '@/contexts/PwaInstallContext';


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
  { id: 'legendary_1', name: 'Légende vivante', icon: '⭐', description: 'Trouver un animal légendaire', total: 1 },
  { id: 'mythic_1', name: 'Mythique !', icon: '🔥', description: 'Trouver un animal mythique', total: 1 },
  { id: 'social_3', name: 'Sociable', icon: '🤝', description: 'Avoir 3 amis explorateurs', total: 3 },
  
  { id: 'level_5', name: 'Niveau 5', icon: '🏅', description: 'Atteindre le niveau 5', total: 5 },
];

interface BadgeProgress {
  badge: BadgeDef;
  progress: number;
  earned: boolean;
}

const ProfilePage = () => {
  const { session } = useAuth();
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

      const [profileRes, friendsRes, capturesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('explorer_friends').select('*', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase.from('captures').select('category, rarity').eq('user_id', userId),
      ]);

      const data = profileRes.data;
      if (data) {
        setProfile(data as Profile);
      }

      const fCount = friendsRes.count || 0;
      setFriendsCount(fCount);

      const captures = capturesRes.data || [];
      const totalCaptures = captures.length;
      

      // Update profile stats
      if (data && data.total_captures !== totalCaptures) {
        await supabase.from('profiles').update({ total_captures: totalCaptures, species_count: totalCaptures }).eq('user_id', userId);
        setProfile(prev => prev ? { ...prev, total_captures: totalCaptures, species_count: totalCaptures } : prev);
      }

      // Compute badges
      const birdCount = captures.filter(c => c.category?.toLowerCase().includes('oiseau')).length;
      const mammalCount = captures.filter(c => c.category?.toLowerCase().includes('mammif')).length;
      const hasRare = captures.some(c => ['rare', 'epic', 'legendary', 'mythic'].includes(c.rarity));
      const hasLegendary = captures.some(c => ['legendary', 'mythic'].includes(c.rarity));
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
      })));

      setLoading(false);
    };
    fetchAll();
  }, [session]);



  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-display">Chargement…</p>
      </main>
    );
  }

  const xpPercent = Math.round((profile.xp / profile.xp_to_next) * 100);
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-foreground">Profil</h1>
          <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Settings className="w-5 h-5 text-foreground" />
          </button>
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

        {/* Social stats */}
        <div className="flex items-center justify-center gap-8 py-3">
          <div className="text-center">
            <p className="text-lg font-display font-bold text-foreground">{friendsCount}</p>
            <p className="text-xs text-muted-foreground">Explorateurs</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<BookOpen className="w-5 h-5 text-primary" />} value={profile.species_count} label="Espèces" />
          <StatCard icon={<CameraIcon className="w-5 h-5 text-amber" />} value={profile.total_captures} label="Captures" />
          <StatCard icon={<MapPin className="w-5 h-5 text-sky" />} value={profile.regions_explored} label="Régions" />
        </div>

        {/* Badges Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber" />
              <h3 className="text-lg font-display font-bold text-foreground">Badges</h3>
            </div>
            <span className="text-xs font-display text-muted-foreground">{earnedCount}/{badges.length} débloqués</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {badges.map(({ badge, progress, earned }) => (
              <div
                key={badge.id}
                className={`relative rounded-xl border p-3 text-center transition-all ${
                  earned
                    ? 'bg-amber/5 border-amber/30 shadow-sm'
                    : 'bg-muted/50 border-transparent opacity-60'
                }`}
              >
                <div className={`text-2xl mb-1 ${earned ? '' : 'grayscale'}`}>{badge.icon}</div>
                <p className="text-[11px] font-display font-bold text-foreground leading-tight">{badge.name}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{badge.description}</p>
                {!earned && (
                  <div className="mt-1.5">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${Math.round((progress / badge.total) * 100)}%` }} />
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{progress}/{badge.total}</p>
                  </div>
                )}
                {!earned && (
                  <div className="absolute top-1.5 right-1.5">
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
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
