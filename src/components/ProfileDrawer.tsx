import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Crown, Loader2, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { prepareSourceImage, readFileAsDataUrl, dataUrlToBytes } from '@/lib/imageProcessing';
import { toast } from 'sonner';
import ProfileBadgesRow from '@/components/ProfileBadgesRow';

interface DrawerProfile {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  xp_to_next: number;
  total_captures: number;
  regions_explored: number;
}

interface ProfileDrawerContextValue {
  openProfile: () => void;
  claimableBadges: number;
}

const ProfileDrawerContext = createContext<ProfileDrawerContextValue | null>(null);

export const useProfileDrawer = () => {
  const value = useContext(ProfileDrawerContext);
  if (!value) throw new Error('useProfileDrawer must be used inside ProfileDrawerProvider');
  return value;
};

export const ProfileButton = ({ className = '' }: { className?: string }) => {
  const { t } = useTranslation();
  const { openProfile, claimableBadges } = useProfileDrawer();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openProfile}
      aria-label={t('profile.page.drawer.open')}
      className={`relative rounded-full ${className}`}
    >
      <UserRound className="!size-5" />
      {claimableBadges > 0 && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-background"
        />
      )}
    </Button>
  );
};

export const ProfileDrawerProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session?.user?.id;
  const { isPremium } = useSubscription(userId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<DrawerProfile | null>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Valeurs légères pour le calcul des badges à réclamer (avant ouverture du profil).
  const [progressLevel, setProgressLevel] = useState(1);
  const [progressRegions, setProgressRegions] = useState(0);
  const [claimKey, setClaimKey] = useState(0);
  const pathname = useLocation().pathname;
  const lastPathRef = useRef(pathname);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [profileResult, followersResult, followingResult, roleResult, badgesResult] = await Promise.all([
      supabase.from('profiles').select('display_name, username, avatar_url, level, xp, xp_to_next, total_captures, regions_explored').eq('user_id', userId).maybeSingle(),
      supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
      supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
      supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
      supabase.from('user_badges').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    setProfile(profileResult.data as DrawerProfile | null);
    setFollowers(followersResult.count ?? 0);
    setFollowing(followingResult.count ?? 0);
    setBadgeCount(badgesResult.count ?? 0);
    const admin = Boolean(roleResult.data);
    setIsAdmin(admin);
    if (admin) {
      const { count } = await supabase.from('captures').select('*', { count: 'exact', head: true }).eq('status', 'pending_review');
      setPendingCount(count ?? 0);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('level, regions_explored')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setProgressLevel(data.level ?? 1);
        setProgressRegions(data.regions_explored ?? 0);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // La pastille se recalcule en changeant d'écran (ex. retour depuis la page badges).
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      setClaimKey((k) => k + 1);
    }
  }, [pathname]);

  const openProfile = useCallback(() => {
    setOpen(true);
  }, []);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    const isHeicName = /\.(heic|heif)$/i.test(file.name);
    if (!file.type.startsWith('image/') && !isHeicName) { toast.error(t('profile.settings.errors.onlyImages')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('profile.settings.errors.imageTooLarge')); return; }
    setUploadingAvatar(true);
    try {
      const normalized = await prepareSourceImage(await readFileAsDataUrl(file));
      if (!normalized) { toast.error(t('profile.settings.errors.imageUnreadable')); return; }
      const filePath = `${userId}/avatar.jpg`;
      await supabase.storage.from('avatars').upload(filePath, dataUrlToBytes(normalized), {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', userId);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success(t('profile.settings.success.photoUpdated'));
    } catch { toast.error(t('profile.settings.errors.uploadError')); }
    finally { setUploadingAvatar(false); }
  };

  // Charge les stats à chaque ouverture, y compris quand la session arrive après.
  useEffect(() => {
    if (open && userId) void loadProfile();
  }, [open, userId, loadProfile]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('profile') !== '1') return;
    openProfile();
    params.delete('profile');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate, openProfile]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const xpPercent = profile?.xp_to_next
    ? Math.min(100, Math.round((profile.xp / profile.xp_to_next) * 100))
    : 0;

  const stats = useMemo(() => [
    { value: profile?.total_captures ?? 0, label: t('profile.page.stats.species') },
    { value: profile?.regions_explored ?? 0, label: t('profile.page.stats.regions') },
    { value: followers, label: t('profile.page.stats.followers') },
    { value: following, label: t('profile.page.stats.following') },
    { value: badgeCount, label: t('profile.page.stats.badges') },
  ], [followers, following, badgeCount, profile, t]);

  const level = profile?.level ?? progressLevel;
  const regions = profile?.regions_explored ?? progressRegions;
  const { badges: badgeProgress } = useBadges(userId, level, regions, claimKey);
  const claimableBadges = useMemo(
    () => badgeProgress.filter((b) => b.earned && !b.claimed).length,
    [badgeProgress],
  );

  return (
    <ProfileDrawerContext.Provider value={{ openProfile, claimableBadges }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[28px] border-border px-5 pb-8 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
          <SheetTitle className="sr-only">{t('profile.page.title')}</SheetTitle>

          {loading && !profile ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
              {t('profile.page.loading')}
            </div>
          ) : (
            <div className="mx-auto max-w-lg">
              <header className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label={t('profile.page.drawer.changePhoto')}
                  className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PremiumAvatar
                    avatarUrl={profile?.avatar_url}
                    name={profile?.display_name}
                    size="xl"
                    isPremium={isPremium}
                    className="ring-4 ring-primary/10 transition-transform active:scale-95"
                  />
                  <span className="absolute inset-x-0 -bottom-0.5 flex justify-center">
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm">
                      {uploadingAvatar ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                    </span>
                  </span>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleAvatarUpload} />
                <h2 className="mt-3 text-xl font-display font-bold text-foreground">
                  {profile?.display_name || t('profile.page.noName')}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {profile?.username || t('profile.page.noUsername')}
                </p>
                <div className="mt-3 w-full max-w-52">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-display">
                    <span className="font-bold text-primary">{t('profile.page.level', { level: profile?.level ?? 1 })}</span>
                    <span className="text-muted-foreground">{t('profile.page.xp', { xp: profile?.xp ?? 0, xpToNext: profile?.xp_to_next ?? 0 })}</span>
                  </div>
                  <Progress value={xpPercent} className="h-1.5 bg-muted [&>div]:bg-primary" />
                </div>
              </header>

              <div className="mt-5 grid grid-cols-5 divide-x divide-border rounded-xl border border-border bg-card py-2.5">
                {stats.map((stat) => (
                  <div key={stat.label} className="min-w-0 px-1 text-center">
                    <p className="text-sm font-display font-bold text-foreground">{stat.value}</p>
                    <p className="truncate text-[9px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {userId && profile && (
                <ProfileBadgesRow
                  userId={userId}
                  level={profile.level}
                  regionsExplored={profile.regions_explored}
                  onOpenAll={() => go('/home?tab=badges')}
                  onClaimed={() => { void loadProfile(); setClaimKey((k) => k + 1); }}
                />
              )}

              <div className="mt-5 space-y-2">
                {!isPremium && (
                  <button
                    type="button"
                    onClick={() => go('/premium')}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-amber/30 bg-gradient-to-r from-amber/15 via-amber/10 to-transparent p-3 text-left transition-transform active:scale-[0.98]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber to-amber-dark shadow-sm">
                      <Crown className="size-5 text-white" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-display font-bold text-foreground">
                        {t('profile.page.drawer.premiumTitle')}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t('profile.page.drawer.premiumSubtitle')}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-amber-foreground">
                      {t('profile.page.drawer.premiumCta')}
                    </span>
                  </button>
                )}
                <Button className="w-full justify-start" onClick={() => go('/settings')}>
                  <Settings />
                  {t('profile.page.drawer.accountSettings')}
                </Button>
                {isAdmin && (
                  <Button variant="outline" className="w-full justify-start" onClick={() => go('/moderation')}>
                    <ShieldCheck className="text-amber" />
                    <span className="flex-1 text-left">{t('profile.page.moderation.title')}</span>
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-amber-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </ProfileDrawerContext.Provider>
  );
};