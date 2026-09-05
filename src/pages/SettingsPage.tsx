import { useState, useRef, useEffect, Fragment } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, KeyRound, Share2, Scale, LogOut, Trash2, Loader2, Camera, Check, X, ChevronRight, Mail, Lock, Smartphone, Bell, Crown, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { isPushSupported, subscribeToPush, unsubscribeFromPush, hasActivePushSubscription } from '@/lib/pushNotifications';
import { prepareSourceImage, readFileAsDataUrl, dataUrlToBytes } from '@/lib/imageProcessing';
import { useTranslation } from 'react-i18next';
import { useAppLocale } from '@/hooks/useAppLocale';
import { Languages } from 'lucide-react';
import { shareOrigin } from '@/lib/authRedirect';

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
  const { isInstalled, isNative, resetDismiss, openInstallGuide } = usePwaInstall();
  const [section, setSection] = useState<'menu' | 'edit' | 'password' | 'delete' | 'language'>('menu');
  const { t } = useTranslation();
  const { locale, isAuto, changeLocale } = useAppLocale();
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

  // Marketing emails
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [defaultShare, setDefaultShare] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // Granular notification preferences
  type NotifPrefs = {
    notify_email_likes: boolean;
    notify_email_comments: boolean;
    notify_email_follows: boolean;
    notify_push_likes: boolean;
    notify_push_comments: boolean;
    notify_push_follows: boolean;
  };
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    notify_email_likes: true,
    notify_email_comments: true,
    notify_email_follows: true,
    notify_push_likes: true,
    notify_push_comments: true,
    notify_push_follows: true,
  });

  useEffect(() => {
    hasActivePushSubscription().then(setPushEnabled);
  }, []);

  // Fetch profile on mount
  useEffect(() => {
    if (!session?.user) return;
    supabase.rpc('get_my_profile').then(({ data }) => {
      if (data) {
        const d: any = data;
        setProfile({ display_name: d.display_name || '', username: d.username || '', avatar_url: d.avatar_url });
        setEditName(d.display_name || '');
        setEditUsername(d.username || '');
        setMarketingEmails(d.marketing_emails ?? true);
        setIsPrivate(d.is_private ?? false);
        setDefaultShare(d.default_share_captures ?? true);
        setNotifPrefs({
          notify_email_likes: d.notify_email_likes ?? true,
          notify_email_comments: d.notify_email_comments ?? true,
          notify_email_follows: d.notify_email_follows ?? true,
          notify_push_likes: d.notify_push_likes ?? true,
          notify_push_comments: d.notify_push_comments ?? true,
          notify_push_follows: d.notify_push_follows ?? true,
        });
      }
      setLoading(false);
    });
  }, [session]);

  const toggleNotifPref = async (key: keyof NotifPrefs) => {
    const newVal = !notifPrefs[key];
    setNotifPrefs(prev => ({ ...prev, [key]: newVal }));
    if (session?.user) {
      await supabase.from('profiles').update({ [key]: newVal } as any).eq('user_id', session.user.id);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    const isHeicName = /\.(heic|heif)$/i.test(file.name);
    if (!file.type.startsWith('image/') && !isHeicName) { toast.error(t('profile.settings.errors.onlyImages')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('profile.settings.errors.imageTooLarge')); return; }
    setUploadingAvatar(true);
    try {
      // Toute image (y compris les HEIC d'iPhone) est normalisée en JPEG :
      // sinon l'avatar ne s'affiche pas dans les navigateurs sans support HEIC.
      const normalized = await prepareSourceImage(await readFileAsDataUrl(file));
      if (!normalized) { toast.error(t('profile.settings.errors.imageUnreadable')); return; }
      const filePath = `${session.user.id}/avatar.jpg`;
      await supabase.storage.from('avatars').upload(filePath, dataUrlToBytes(normalized), {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', session.user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success(t('profile.settings.success.photoUpdated'));
    } catch { toast.error(t('profile.settings.errors.uploadError')); }
    finally { setUploadingAvatar(false); }
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;
    const trimmedName = editName.trim();
    if (!trimmedName) { toast.error(t('profile.settings.errors.emptyName')); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: trimmedName, username: editUsername.trim() || null }).eq('user_id', session.user.id);
    if (error) toast.error(t('profile.settings.errors.saveError'));
    else {
      setProfile(prev => prev ? { ...prev, display_name: trimmedName, username: editUsername.trim() } : prev);
      toast.success(t('profile.settings.success.profileUpdated'));
      setSection('menu');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword) { toast.error(t('profile.settings.errors.enterOldPassword')); return; }
    if (newPassword.length < 6) { toast.error(t('profile.settings.errors.passwordTooShort')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('profile.settings.errors.passwordMismatch')); return; }
    setChangingPassword(true);
    // Verify old password by re-signing in
    const email = session?.user?.email;
    if (!email) { toast.error(t('profile.settings.errors.emailNotFound')); setChangingPassword(false); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (signInError) {
      toast.error(t('profile.settings.errors.wrongOldPassword'));
      setChangingPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success(t('profile.settings.success.passwordChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSection('menu');
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') { toast.error(t('profile.settings.errors.typeToConfirm')); return; }
    setDeleting(true);
    // Delete user data then sign out
    if (session?.user) {
      await supabase.from('captures').delete().eq('user_id', session.user.id);
      await supabase.from('profiles').delete().eq('user_id', session.user.id);
      await supabase.from('explorer_follows').delete().eq('follower_id', session.user.id);
    }
    await signOut();
    toast.success(t('profile.settings.success.accountDeleted'));
    navigate('/auth');
  };

  const handleShare = () => {
    const username = profile?.username?.replace(/^@/, '') || session?.user?.id;
    const shareUrl = `${shareOrigin()}/u/${username}`;
    if (navigator.share) {
      navigator.share({ title: t('profile.settings.share.title'), text: t('profile.settings.share.text'), url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t('profile.settings.success.linkCopied'));
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
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => section === 'menu' ? navigate('/profile') : setSection('menu')}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">
            {section === 'menu' && t('settings.title')}
            {section === 'edit' && t('settings.editProfile')}
            {section === 'password' && t('settings.changePassword')}
            {section === 'delete' && t('settings.deleteAccount')}
            {section === 'language' && t('language.title')}
          </h1>
        </div>
      </PageHeader>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {section === 'menu' && (
          <div className="space-y-1">

            <MenuItem icon={<Crown className="w-5 h-5" />} label={t('settings.premium')} onClick={() => navigate('/premium')} />
            <MenuItem icon={<Pencil className="w-5 h-5" />} label={t('settings.editProfile')} onClick={() => setSection('edit')} />
            <MenuItem icon={<KeyRound className="w-5 h-5" />} label={t('settings.changePassword')} onClick={() => setSection('password')} />
            <MenuItem icon={<Share2 className="w-5 h-5" />} label={t('settings.shareProfile')} onClick={handleShare} />
            <MenuItem icon={<Languages className="w-5 h-5" />} label={t('language.title')} onClick={() => setSection('language')} />
            <MenuItem icon={<MessageCircle className="w-5 h-5" />} label={t('settings.discord')} onClick={() => window.open('https://discord.gg/YrAEV5EQa4', '_blank', 'noopener,noreferrer')} />
            <MenuItem icon={<Scale className="w-5 h-5" />} label={t('settings.legal')} onClick={() => navigate('/legal')} />
            <MenuItem icon={<Lock className="w-5 h-5" />} label={t('settings.privacy')} onClick={() => navigate('/confidentialite')} />
            {!isNative && !isInstalled && (
              <MenuItem
                icon={<Smartphone className="w-5 h-5" />}
                label={t('settings.install')}
                onClick={() => {
                  resetDismiss();
                  openInstallGuide();
                }}
              />
            )}
            <div className="pt-4 space-y-1">
              <MenuItem icon={<LogOut className="w-5 h-5 text-destructive" />} label={t('settings.signOut')} onClick={async () => { await signOut(); toast.success(t('settings.signedOut')); }} destructive />
              <MenuItem icon={<Trash2 className="w-5 h-5 text-destructive" />} label={t('settings.deleteMyAccount')} onClick={() => setSection('delete')} destructive />
            </div>
          </div>
        )}

        {section === 'language' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-body px-1 pb-2">{t('language.subtitle')}</p>
            {([
              { value: 'auto' as const, label: t('language.auto'), active: isAuto },
              { value: 'fr' as const, label: t('language.fr'), active: !isAuto && locale === 'fr' },
              { value: 'en' as const, label: t('language.en'), active: !isAuto && locale === 'en' },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => { changeLocale(opt.value); toast.success(t('language.updated')); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors ${opt.active ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted hover:bg-muted/70'}`}
              >
                <span className="text-sm font-display font-semibold text-foreground">{opt.label}</span>
                {opt.active && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {section === 'edit' && profile && (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" onChange={handleAvatarUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-primary/30 overflow-hidden group"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={t('profile.settings.avatarAlt')} className="w-full h-full object-cover" />
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
                <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">{t('profile.settings.displayName')}</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={50} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">{t('profile.settings.username')}</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} maxLength={30} placeholder={t('profile.settings.usernamePlaceholder')} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
            </div>

            {/* Marketing emails toggle */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl">
              <div>
                <span className="text-sm font-display font-semibold text-foreground block">{t('profile.settings.marketingEmails.label')}</span>
                <span className="text-[11px] text-muted-foreground">{t('profile.settings.marketingEmails.hint')}</span>
              </div>
              <button
                onClick={async () => {
                  const newVal = !marketingEmails;
                  setMarketingEmails(newVal);
                  if (session?.user) {
                    await supabase.from('profiles').update({ marketing_emails: newVal } as any).eq('user_id', session.user.id);
                    toast.success(newVal ? t('profile.settings.marketingEmails.enabled') : t('profile.settings.marketingEmails.disabled'));
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${marketingEmails ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${marketingEmails ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Push notifications toggle */}
            {isPushSupported() && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl">
                <div>
                  <span className="text-sm font-display font-semibold text-foreground flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" /> {t('profile.settings.push.label')}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{t('profile.settings.push.hint')}</span>
                </div>
                <button
                  disabled={pushBusy}
                  onClick={async () => {
                    setPushBusy(true);
                    if (pushEnabled) {
                      await unsubscribeFromPush();
                      setPushEnabled(false);
                      toast.success(t('profile.settings.push.disabled'));
                    } else {
                      const ok = await subscribeToPush();
                      setPushEnabled(ok);
                      toast[ok ? 'success' : 'error'](ok ? t('profile.settings.push.enabled') : t('profile.settings.push.denied'));
                    }
                    setPushBusy(false);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-primary' : 'bg-muted-foreground/30'} disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            )}

            {/* Private account toggle */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl">
              <div>
                <span className="text-sm font-display font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> {t('profile.settings.privateAccount.label')}
                </span>
                <span className="text-[11px] text-muted-foreground">{t('profile.settings.privateAccount.hint')}</span>
              </div>
              <button
                onClick={async () => {
                  const newVal = !isPrivate;
                  setIsPrivate(newVal);
                  if (session?.user) {
                    await supabase.from('profiles').update({ is_private: newVal } as any).eq('user_id', session.user.id);
                    toast.success(newVal ? t('profile.settings.privateAccount.enabled') : t('profile.settings.privateAccount.disabled'));
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${isPrivate ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Default share captures toggle */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl">
              <div className="pr-3">
                <span className="text-sm font-display font-semibold text-foreground flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> {t('profile.settings.defaultShare.label')}
                </span>
                <span className="text-[11px] text-muted-foreground">{t('profile.settings.defaultShare.hint')}</span>
              </div>
              <button
                onClick={async () => {
                  const newVal = !defaultShare;
                  setDefaultShare(newVal);
                  if (session?.user) {
                    await supabase.from('profiles').update({ default_share_captures: newVal } as any).eq('user_id', session.user.id);
                    toast.success(newVal ? t('profile.settings.defaultShare.enabled') : t('profile.settings.defaultShare.disabled'));
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${defaultShare ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${defaultShare ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Granular notification preferences */}
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-foreground" />
                <span className="text-sm font-display font-semibold text-foreground">{t('profile.settings.notifications.title')}</span>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">{t('profile.settings.notifications.subtitle')}</p>

              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 items-center pt-1">
                <span></span>
                <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 justify-center"><Mail className="w-3 h-3" /> {t('profile.settings.notifications.email')}</span>
                <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 justify-center"><Bell className="w-3 h-3" /> {t('profile.settings.notifications.push')}</span>

                {([
                  { label: t('profile.settings.notifications.likes'), emailKey: 'notify_email_likes', pushKey: 'notify_push_likes' },
                  { label: t('profile.settings.notifications.comments'), emailKey: 'notify_email_comments', pushKey: 'notify_push_comments' },
                  { label: t('profile.settings.notifications.follows'), emailKey: 'notify_email_follows', pushKey: 'notify_push_follows' },
                ] as const).map(({ label, emailKey, pushKey }) => (
                  <Fragment key={label}>
                    <span className="text-sm text-foreground font-body">{label}</span>
                    <div className="flex justify-center"><NotifToggle on={notifPrefs[emailKey]} onClick={() => toggleNotifPref(emailKey)} /></div>
                    <div className="flex justify-center"><NotifToggle on={notifPrefs[pushKey]} onClick={() => toggleNotifPref(pushKey)} /></div>
                  </Fragment>
                ))}
              </div>

              {!pushEnabled && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  {t('profile.settings.push.enableHint')}
                </p>
              )}
            </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t('profile.settings.save')}
            </button>
          </div>
        )}

        {section === 'password' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-body">{t('profile.settings.password.intro')}</p>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">{t('profile.settings.password.old')}</label>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">{t('profile.settings.password.new')}</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">{t('profile.settings.password.confirm')}</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body" />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display text-sm font-semibold disabled:opacity-50"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {t('profile.settings.password.submit')}
            </button>
          </div>
        )}

        {section === 'delete' && (
          <div className="space-y-4">
            <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
              <p className="text-sm text-destructive font-display font-semibold mb-2">{t('profile.settings.delete.warningTitle')}</p>
              <p className="text-xs text-muted-foreground font-body">
                {t('profile.settings.delete.warningText')}
              </p>
            </div>
            <div>
              <label className="text-xs font-display font-semibold text-muted-foreground mb-1 block">
                {t('profile.settings.delete.confirmLabel', { word: 'SUPPRIMER' })}
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={t('profile.settings.delete.placeholder')}
                className="w-full px-4 py-3 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 font-body"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== 'SUPPRIMER'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive text-destructive-foreground font-display text-sm font-semibold disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('profile.settings.delete.submit')}
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

const NotifToggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    aria-pressed={on}
    className={`relative w-10 h-5.5 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    style={{ width: '2.5rem', height: '1.375rem' }}
  >
    <span className={`absolute top-0.5 left-0.5 w-[1rem] h-[1rem] rounded-full bg-card shadow transition-transform ${on ? 'translate-x-[1.125rem]' : 'translate-x-0'}`} />
  </button>
);

export default SettingsPage;
