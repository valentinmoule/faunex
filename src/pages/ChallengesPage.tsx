import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ExplorersLeaderboard from '@/components/ExplorersLeaderboard';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Bell, Play, Sprout } from 'lucide-react';
import LeagueWeekRecap from '@/components/league/LeagueWeekRecap';
import { PageHeader } from '@/components/PageHeader';
import HeaderLevelPill from '@/components/HeaderLevelPill';
import QuestsInline from '@/components/QuestsInline';
import CaptureQuotaBadge from '@/components/CaptureQuotaBadge';
import { ProfileButton } from '@/components/ProfileDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { learningStatus, learningText } from '@/lib/learning';
import sideForest from '@/assets/learning/side-forest.webp';
import sideGarden from '@/assets/learning/side-garden.webp';
import sidePond from '@/assets/learning/side-pond.webp';
import sideMountain from '@/assets/learning/side-mountain.webp';

const worlds = [sideGarden, sideForest, sidePond, sideMountain];

/** Onglet « Défis » : Académie mise en avant, puis les quêtes. */
export default function ChallengesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isPremium, loading: premiumLoading } = useSubscription(session?.user?.id);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: 'challenges' | 'league' | 'leaderboard' = rawTab === 'league' || rawTab === 'leaderboard' ? rawTab : 'challenges';
  const setTab = (next: 'challenges' | 'league' | 'leaderboard') => setSearchParams(next === 'challenges' ? {} : { tab: next }, { replace: true });
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('read', false)
      .then(({ count }) => setUnreadCount(count || 0));
    const channel = supabase
      .channel(`notif-count-challenges-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => {
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('read', false).then(({ count }) => setUnreadCount(count || 0));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const status = useQuery({ queryKey: ['learning', session?.user.id], queryFn: learningStatus, enabled: !!session?.user });
  const data = status.data;
  const pathId = session?.user.id ? localStorage.getItem(`learning-path:${session.user.id}`) : null;
  const path = data?.paths.find(p => p.id === pathId) ?? data?.paths[0];
  const en = i18n.language.startsWith('en');
  const done = new Set(data?.completed.filter(c => c.path_id === path?.id).map(c => c.lesson_id));
  const chapters = path?.chapters ?? [];
  const chapterIndex = Math.max(0, chapters.findIndex(c => c.lessons.some(l => !done.has(l.id))));
  const chapter = chapters[chapterIndex];
  const chapterDone = chapter ? chapter.lessons.filter(l => done.has(l.id)).length : 0;
  const total = chapter?.lessons.length ?? 0;
  const allDone = chapters.length > 0 && chapters.every(c => c.lessons.every(l => done.has(l.id)));
  const pct = total ? Math.round((chapterDone / total) * 100) : 0;
  const cta = allDone ? t('challenges.review') : done.size === 0 ? t('challenges.start') : t('challenges.continue');

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader sticky autoHide onHiddenChange={setHeaderHidden} className="bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          {/* Accès au profil (avatar) à gauche ; compteurs et notifications à droite */}
          <div className="flex min-w-0 items-center gap-3"><HeaderLevelPill /></div>
          <div className="flex min-w-0 items-center gap-4">
            <CaptureQuotaBadge userId={session?.user?.id} isPremium={isPremium} premiumLoading={premiumLoading} />
            <button
              onClick={() => navigate('/notifications')}
              aria-label={t('social.notifications.title')}
              className="relative -mr-1 h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <span className="relative inline-flex">
                <Bell className="w-5 h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span aria-hidden className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive" />
                )}
              </span>
            </button>
          </div>
        </div>
      </PageHeader>
      <div className={`hub-tabbar sticky z-30 mx-auto max-w-lg px-4 pt-2 pb-2 bg-gradient-to-b from-background via-background/95 to-transparent ${headerHidden ? 'top-0 hub-tabbar--hidden' : 'top-[73px]'}`}>
        <div className="game-tabs flex items-center w-full" role="tablist">
          {([
            { key: 'challenges' as const, label: t('nav.challenges') },
            { key: 'league' as const, label: t('social.leaderboard.tabLeague') },
            { key: 'leaderboard' as const, label: t('nav.leaderboard') },
          ]).map(({ key, label }) => (
            <Button key={key} variant="ghost" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className="game-tab min-w-0 flex-1 h-10 px-2 text-xs">
              <span className="truncate">{label}</span>
            </Button>
          ))}
        </div>
      </div>
      {tab !== 'challenges' ? (
        <div className="mx-auto max-w-lg">{tab === 'league' ? <LeagueWeekRecap userId={session?.user?.id}><ExplorersLeaderboard key={tab} mode={tab === 'league' ? 'league' : 'honors'} /></LeagueWeekRecap> : <ExplorersLeaderboard key={tab} mode="honors" />}</div>
      ) : (
      <div className="mx-auto max-w-lg px-4 pt-1 space-y-4">
        <h1 className="sr-only">{t('nav.challenges')}</h1>

        <QuestsInline />

        <button
          type="button"
          onClick={() => navigate('/apprendre')}
          className="mission-plate quest-card-enter block w-full overflow-hidden rounded-3xl p-4 text-left active:scale-[0.98] transition-transform"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-[10px] font-display font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary"><Sprout className="h-3 w-3" />{t('challenges.trainingEyebrow')}</span>
                {chapter && <span>{t('challenges.chapter', { n: chapterIndex + 1 })}</span>}
              </div>
              <p className="mt-1 text-[15px] font-display font-black leading-tight text-foreground">
                {chapter ? learningText(chapter as unknown as Record<string, unknown>, 'title', en) : t('challenges.academyDesc')}
              </p>
              {chapter && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="mission-gauge h-2.5 flex-1 overflow-hidden rounded-full">
                    <div className="mission-gauge-fill h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%` }} />
                  </div>
                  <span className="text-[11px] font-display font-black tabular-nums text-foreground">{chapterDone}/{total}</span>
                </div>
              )}
            </div>
            <div className="flex w-14 shrink-0 flex-col items-center gap-1">
              <img src={worlds[chapterIndex % worlds.length]} alt="" className="h-11 w-11 rounded-2xl object-cover" />
              <span className="text-[10px] font-display font-black text-amber">+5 XP</span>
            </div>
          </div>
          <span className="game-button relative mt-3 flex h-10 w-full items-center justify-center gap-2 text-sm font-display">
            <Play className="h-4 w-4 fill-current" />{cta}
          </span>
        </button>
      </div>
      )}
    </main>
  );
}
