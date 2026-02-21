import { Settings, ChevronRight, Award, MapPin, Camera as CameraIcon, BookOpen } from 'lucide-react';
import { mockProfile } from '@/data/mockData';
import { Progress } from '@/components/ui/progress';

const ProfilePage = () => {
  const p = mockProfile;
  const xpPercent = Math.round((p.xp / p.xpToNext) * 100);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-foreground">Profil</h1>
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <Settings className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-primary/30">
            {p.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-foreground">{p.name}</h2>
            <p className="text-sm text-muted-foreground">{p.username}</p>
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-display font-semibold text-primary">Niv. {p.level}</span>
                <span className="text-[10px] text-muted-foreground">{p.xp}/{p.xpToNext} XP</span>
              </div>
              <Progress value={xpPercent} className="h-2 bg-muted [&>div]:bg-primary" />
            </div>
          </div>
        </div>

        {/* Social stats */}
        <div className="flex items-center justify-center gap-8 py-3">
          <div className="text-center">
            <p className="text-lg font-display font-bold text-foreground">{p.followers}</p>
            <p className="text-xs text-muted-foreground">Abonnés</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-display font-bold text-foreground">{p.following}</p>
            <p className="text-xs text-muted-foreground">Abonnements</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<BookOpen className="w-5 h-5 text-primary" />} value={p.speciesCount} label="Espèces" />
          <StatCard icon={<CameraIcon className="w-5 h-5 text-amber" />} value={p.totalCaptures} label="Captures" />
          <StatCard icon={<MapPin className="w-5 h-5 text-sky" />} value={p.regionsExplored} label="Régions" />
        </div>

        {/* Badges */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-amber" />
              Badges
            </h3>
            <button className="text-xs text-primary font-display font-semibold flex items-center gap-0.5">
              Voir tout <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {p.badges.map(badge => (
              <div
                key={badge.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  badge.earned
                    ? 'bg-card border-primary/20'
                    : 'bg-muted/50 border-border opacity-60'
                }`}
              >
                <span className="text-2xl">{badge.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold text-foreground truncate">{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground">{badge.progress}/{badge.total}</p>
                </div>
                {badge.earned && <span className="text-primary text-lg">✓</span>}
              </div>
            ))}
          </div>
        </section>
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
