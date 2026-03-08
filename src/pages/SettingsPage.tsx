import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, KeyRound, Share2, Scale, LogOut, Trash2, Loader2, Camera, Check, X, ChevronRight, Sun, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface SettingsProps {
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  onProfileUpdate: (updates: { display_name?: string; username?: string; avatar_url?: string }) => void;
}

const SettingsPage = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [section, setSection] = useState<'menu' | 'edit' | 'password' | 'delete'>('menu');
  const [profile, setProfile] = useState<{ display_name: string; username: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (!session?.user) return;
    supabase.from('profiles').select('display_name, username, avatar_url').eq('user_id', session.user.id).single().then(({ data }) => {
      if (data) {
        setProfile({ display_name: data.display_name || '', username: data.username || '', avatar_url: data.avatar_url });
        setEditName(data.display_name || '');
        setEditUsername(data.username || '');
      }
      setLoading(false);
    });
  }, [session]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    if (!file.type.startsWith('image/')) { toast.error('Seules les images sont acceptées'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${session.user.id}/avatar.${ext}`;
      await supabase.storage.from('avatars').upload(filePath, file, { cacheControl: '3600', upsert: true });
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', session.user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success('Photo mise à jour !');
    } catch { toast.error("Erreur lors de l'upload"); }
    finally { setUploadingAvatar(false); }
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;
    const trimmedName = editName.trim();
    if (!trimmedName) { toast.error('Le nom ne peut pas être vide'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: trimmedName, username: editUsername.trim() || null }).eq('user_id', session.user.id);
    if (error) toast.error('Erreur lors de la sauvegarde');
    else {
      setProfile(prev => prev ? { ...prev, display_name: trimmedName, username: editUsername.trim() } : prev);
      toast.success('Profil mis à jour !');
      setSection('menu');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword) { toast.error('Entre ton ancien mot de passe'); return; }
    if (newPassword.length < 6) { toast.error('Le mot de passe doit faire au moins 6 caractères'); return; }
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setChangingPassword(true);
    // Verify old password by re-signing in
    const email = session?.user?.email;
    if (!email) { toast.error('Erreur: email introuvable'); setChangingPassword(false); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (signInError) {
      toast.error('Ancien mot de passe incorrect');
      setChangingPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success('Mot de passe modifié !');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSection('menu');
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') { toast.error('Tape SUPPRIMER pour confirmer'); return; }
    setDeleting(true);
    // Delete user data then sign out
    if (session?.user) {
      await supabase.from('captures').delete().eq('user_id', session.user.id);
      await supabase.from('profiles').delete().eq('user_id', session.user.id);
      await supabase.from('explorer_friends').delete().or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`);
    }
    await signOut();
    toast.success('Compte supprimé');
    navigate('/auth');
  };

  const handleShare = () => {
    const username = profile?.username?.replace(/^@/, '') || session?.user?.id;
    const shareUrl = `${window.location.origin}/u/${username}`;
    if (navigator.share) {
      navigator.share({ title: 'Mon profil Faunex', text: 'Rejoins-moi sur Faunex !', url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Lien copié !');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => section === 'menu' ? navigate('/profile') : setSection('menu')}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">
            {section === 'menu' && 'Paramètres'}
            {section === 'edit' && 'Modifier le profil'}
            {section === 'password' && 'Changer le mot de passe'}
            {section === 'delete' && 'Supprimer le compte'}
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {section === 'menu' && (
          <div className="space-y-1">
            {/* Theme toggle */}
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-foreground" /> : <Sun className="w-5 h-5 text-foreground" />}
                <span className="text-sm font-display font-semibold text-foreground">Mode sombre</span>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`relative w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <MenuItem icon={<Pencil className="w-5 h-5" />} label="Modifier le profil" onClick={() => setSection('edit')} />
            <MenuItem icon={<KeyRound className="w-5 h-5" />} label="Changer le mot de passe" onClick={() => setSection('password')} />
            <MenuItem icon={<Share2 className="w-5 h-5" />} label="Partager mon profil" onClick={handleShare} />
            <MenuItem icon={<Scale className="w-5 h-5" />} label="Mentions légales" onClick={() => navigate('/legal')} />
            <div className="pt-4 space-y-1">
              <MenuItem icon={<LogOut className="w-5 h-5 text-destructive" />} label="Se déconnecter" onClick={async () => { await signOut(); toast.success('Déconnecté'); }} destructive />
              <MenuItem icon={<Trash2 className="w-5 h-5 text-destructive" />} label="Supprimer mon compte" onClick={() => setSection('delete')} destructive />
            </div>
          </div>
        )}

        {section === 'edit' && profile && (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-primary/30 overflow-hidden group"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(profile.display_name || '?').charAt(0).toUpperCase()}</span>
                )}
                <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" /> : <Camera className="w-5 h-5 text-primary-foreground" />}
                </div>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Nom d'affichage</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={50} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Pseudo</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} maxLength={30} placeholder="@pseudo" className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        )}

        {section === 'password' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-body">Entre ton ancien mot de passe puis choisis-en un nouveau (6 caractères minimum).</p>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Ancien mot de passe</label>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Nouveau mot de passe</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">Confirmer le nouveau mot de passe</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display text-sm font-semibold disabled:opacity-50"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Modifier le mot de passe
            </button>
          </div>
        )}

        {section === 'delete' && (
          <div className="space-y-4">
            <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
              <p className="text-sm text-destructive font-display font-semibold mb-2">⚠️ Action irréversible</p>
              <p className="text-xs text-muted-foreground font-body">
                La suppression de ton compte effacera toutes tes captures, ton profil et tes relations d'amitié. Cette action ne peut pas être annulée.
              </p>
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">
                Tape <span className="text-destructive">SUPPRIMER</span> pour confirmer
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 font-body"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== 'SUPPRIMER'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive text-destructive-foreground font-display text-sm font-semibold disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer définitivement
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

const MenuItem = ({ icon, label, onClick, destructive }: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
      destructive
        ? 'text-destructive hover:bg-destructive/10'
        : 'text-foreground hover:bg-muted'
    }`}
  >
    {icon}
    <span className="flex-1 text-left text-sm font-display font-semibold">{label}</span>
    <ChevronRight className={`w-4 h-4 ${destructive ? 'text-destructive/50' : 'text-muted-foreground'}`} />
  </button>
);

export default SettingsPage;
