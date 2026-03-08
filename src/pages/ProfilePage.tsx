import { useState, useEffect, useRef } from 'react';
import { Settings, ChevronRight, Award, MapPin, Camera as CameraIcon, BookOpen, LogOut, Pencil, X, Check, Loader2, Camera } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

const ProfilePage = () => {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [friendsCount, setFriendsCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        setEditName(data.display_name || '');
        setEditUsername(data.username || '');
      }

      // Count accepted friends
      const { count } = await supabase
        .from('explorer_friends')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`);

      setFriendsCount(count || 0);

      // Update species_count and total_captures from actual captures
      const { count: capturesCount } = await supabase
        .from('captures')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (capturesCount !== null && data && (data.total_captures !== capturesCount)) {
        await supabase.from('profiles').update({
          total_captures: capturesCount,
          species_count: capturesCount, // simplified: 1 capture = 1 species for now
        }).eq('user_id', session.user.id);

        setProfile(prev => prev ? { ...prev, total_captures: capturesCount, species_count: capturesCount } : prev);
      }

      setLoading(false);
    };
    fetch();
  }, [session]);

  const handleSave = async () => {
    if (!session?.user || !profile) return;
    const trimmedName = editName.trim();
    const trimmedUsername = editUsername.trim();
    if (!trimmedName) { toast.error('Le nom ne peut pas être vide'); return; }

    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: trimmedName,
      username: trimmedUsername || null,
    }).eq('user_id', session.user.id);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      setProfile(prev => prev ? { ...prev, display_name: trimmedName, username: trimmedUsername } : prev);
      setEditing(false);
      toast.success('Profil mis à jour !');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Déconnecté');
  };

  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-display">Chargement…</p>
      </main>
    );
  }

  const xpPercent = Math.round((profile.xp / profile.xp_to_next) * 100);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-foreground">Profil</h1>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <Pencil className="w-5 h-5 text-foreground" />
              </button>
            )}
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-destructive/10 transition-colors">
              <LogOut className="w-5 h-5 text-destructive" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-primary/30">
            {(profile.display_name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Nom d'affichage"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                />
                <input
                  type="text"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  placeholder="@pseudo"
                  maxLength={30}
                  className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Sauvegarder
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditName(profile.display_name || ''); setEditUsername(profile.username || ''); }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-display font-semibold"
                  >
                    <X className="w-3.5 h-3.5" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-display font-bold text-foreground">{profile.display_name || 'Sans nom'}</h2>
                <p className="text-sm text-muted-foreground">{profile.username || '@inconnu'}</p>
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-display font-semibold text-primary">Niv. {profile.level}</span>
                    <span className="text-[10px] text-muted-foreground">{profile.xp}/{profile.xp_to_next} XP</span>
                  </div>
                  <Progress value={xpPercent} className="h-2 bg-muted [&>div]:bg-primary" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Social stats */}
        <div className="flex items-center justify-center gap-8 py-3">
          <div className="text-center">
            <p className="text-lg font-display font-bold text-foreground">{friendsCount}</p>
            <p className="text-xs text-muted-foreground">Amis</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<BookOpen className="w-5 h-5 text-primary" />} value={profile.species_count} label="Espèces" />
          <StatCard icon={<CameraIcon className="w-5 h-5 text-amber" />} value={profile.total_captures} label="Captures" />
          <StatCard icon={<MapPin className="w-5 h-5 text-sky" />} value={profile.regions_explored} label="Régions" />
        </div>

        {/* Logout button at bottom */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive font-display text-sm font-semibold hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
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
