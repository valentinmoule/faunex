import { useEffect, useState, type CSSProperties } from 'react';
import {
  Target, Gift, Check, Loader2, Share2, Camera, Compass, MapPin,
  Sparkles, Clock, type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfWeekISO } from '@/lib/weekUtils';
import { useTranslation } from 'react-i18next';
import { shareOrigin } from '@/lib/authRedirect';
import { Button } from '@/components/ui/button';
import { shareContent } from '@/lib/share';
import XpPill from '@/components/XpPill';
import { useNavigate } from 'react-router-dom';

interface Quest {
  id: string;
  quest_type: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  xp_reward: number;
  quest_date: string;
}

const QUEST_ICONS: Record<string, LucideIcon> = {
  capture_rarity: Sparkles,
  capture_count: Camera,
  capture_different: Compass,
  new_zone: MapPin,
  share_app: Share2,
};

const QUEST_TINTS: Record<string, string> = {
  capture_rarity: 'var(--rarity-ultra-rare)',
  capture_count: 'var(--primary)',
  capture_different: 'var(--sky)',
  new_zone: 'var(--amber)',
  share_app: 'var(--rarity-rare)',
};

const QuestsInline = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [chestBusy, setChestBusy] = useState(false);
  const CHEST_XP = 50;

  const fetchQuests = async () => {
    if (!session?.user) return;
    const weekStart = startOfWeekISO();
    const { data, error } = await supabase
      .from('weekly_quests')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('quest_date', weekStart)
      .order('created_at');
    if (!error && data) setQuests(data as Quest[]);
    const { data: chest } = await supabase.from('weekly_chest_claims').select('week_start').eq('user_id', session.user.id).eq('week_start', weekStart).maybeSingle();
    setChestClaimed(!!chest);
    if (!error && (!data || data.length === 0)) {
      await supabase.rpc('ensure_weekly_quests');
      const { data: retry } = await supabase
        .from('weekly_quests').select('*')
        .eq('user_id', session.user.id)
        .eq('quest_date', weekStart)
        .order('created_at');
      if (retry) setQuests(retry as Quest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuests();
    if (!session?.user) return;
    const channel = supabase
      .channel(`daily-quests-inline-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'daily_quests',
        filter: `user_id=eq.${session.user.id}`,
      }, () => fetchQuests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const claimReward = async (questId: string) => {
    setClaiming(questId);
    try {
      const { data, error } = await supabase.rpc('claim_quest_reward', { p_quest_id: questId });
      if (error) throw error;
      if (data) {
        const quest = quests.find((q) => q.id === questId);
        setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, claimed: true } : q)));
        toast.success(t('profile.quests.xpEarned', { xp: quest?.xp_reward || 0 }));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('profile.quests.claimError'));
    } finally {
      setClaiming(null);
    }
  };

  const handleShareApp = async (questId: string) => {
    const shareData = {
      title: t('profile.quests.shareTitle'),
      text: t('profile.quests.shareText'),
      url: shareOrigin(),
    };
    try {
      const result = await shareContent(shareData);
      if (result === 'cancelled') return;
      if (result === 'copied') {
        toast.success(t('profile.quests.linkCopied'));
      }
      await supabase.rpc('complete_share_quest', { p_quest_id: questId });
      setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, progress: 1, completed: true } : q)));
      toast.success(t('profile.quests.shareCompleted'));
    } catch { /* cancelled */ }
  };

  

  const claimWithCelebration = async (questId: string) => {
    await claimReward(questId);
    setCelebrating(questId);
    window.setTimeout(() => setCelebrating((c) => (c === questId ? null : c)), 1400);
  };

  const openChest = async () => {
    setChestBusy(true);
    const { data, error } = await supabase.rpc('claim_weekly_chest', { p_week: startOfWeekISO() });
    setChestBusy(false);
    if (error || !data) { toast.error(t('profile.quests.claimError')); return; }
    setChestClaimed(true);
    setCelebrating('chest');
    window.setTimeout(() => setCelebrating((c) => (c === 'chest' ? null : c)), 1400);
    toast.success(t('profile.quests.xpEarned', { xp: data }));
  };

  const claimedCount = quests.filter((q) => q.claimed).length;
  const totalXp = quests.reduce((sum, q) => sum + q.xp_reward, 0);
  const earnedXp = quests.filter((q) => q.claimed).reduce((sum, q) => sum + q.xp_reward, 0);
  const perfect = quests.length > 0 && claimedCount === quests.length;
  const rank = (q: Quest) => (q.completed && !q.claimed ? 0 : q.claimed ? 2 : 1);
  const sorted = [...quests].sort((a, b) => rank(a) - rank(b));

  // Fin de semaine : lundi suivant 00:00 (heure locale)
  const [y, m, d] = startOfWeekISO().split('-').map(Number);
  const msLeft = new Date(y, m - 1, d + 7).getTime() - Date.now();
  const daysLeft = Math.floor(msLeft / 86_400_000);
  const hoursLeft = Math.max(1, Math.floor((msLeft % 86_400_000) / 3_600_000));
  const endsIn = daysLeft > 0 ? t('profile.quests.endsInDays', { d: daysLeft, h: hoursLeft }) : t('profile.quests.endsInHours', { h: hoursLeft });

  return (
    <section aria-labelledby="weekly-quests-title" className="space-y-4">
      {/* Objectif de la semaine : chemin de quêtes jusqu'au coffre */}
      <div className="quest-hero relative overflow-hidden rounded-3xl p-5">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-primary">{t('profile.quests.heroKicker')}</p>
            <h3 id="weekly-quests-title" className="mt-0.5 text-xl font-display font-black leading-tight text-foreground">
              {perfect ? t('profile.quests.perfectTitle') : t('profile.quests.weekTitle')}
            </h3>
            <p className="mt-1 text-[12px] font-display font-semibold text-muted-foreground">
              {chestClaimed ? t('profile.quests.perfectBody') : perfect ? t('profile.quests.chestReady', { xp: CHEST_XP }) : t('profile.quests.chestGoal', { xp: CHEST_XP })}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-display font-extrabold text-foreground shadow-card">
            <Clock className="h-3.5 w-3.5 text-primary" />{endsIn}
          </span>
        </div>

        {quests.length > 0 && (
          <div className="relative mt-5 flex items-center">
            <div aria-hidden className="absolute left-5 right-6 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted">
              <div className="quest-progress-fill h-full rounded-full bg-primary" style={{ width: `${(claimedCount / quests.length) * 100}%` }} />
            </div>
            <div className="relative flex w-full items-center justify-between">
              {quests.map((q) => {
                const Icon = QUEST_ICONS[q.quest_type] ?? Target;
                const state = q.claimed ? 'claimed' : q.completed ? 'ready' : 'todo';
                return (
                  <span key={q.id} data-state={state} className="quest-node flex h-10 w-10 items-center justify-center rounded-full">
                    {q.claimed ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />}
                  </span>
                );
              })}
              <span data-open={perfect && !chestClaimed} className="quest-chest relative flex h-14 w-14 items-center justify-center rounded-2xl" aria-label={t('profile.quests.chest')}>
                {chestClaimed ? <Check className="h-7 w-7" strokeWidth={3} /> : <Gift className="h-7 w-7" strokeWidth={2.2} />}
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-display font-black text-primary-foreground">+{CHEST_XP} XP</span>
              </span>
            </div>
          </div>
        )}
        <p className="relative mt-4 text-[12px] font-display font-bold text-foreground">
          {t('profile.quests.completedCount', { completed: claimedCount, total: quests.length })} · {earnedXp + (chestClaimed ? CHEST_XP : 0)}/{totalXp + CHEST_XP} XP
        </p>
        {perfect && !chestClaimed && (
          <Button size="sm" variant="ghost" onClick={openChest} disabled={chestBusy} className="game-button quest-claim-pulse relative mt-3 h-11 w-full text-sm font-display">
            {chestBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            {t('profile.quests.openChest', { xp: CHEST_XP })}
          </Button>
        )}
        {celebrating === 'chest' && (
          <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="quest-spark absolute h-2.5 w-2.5 rounded-full bg-amber" style={{ '--a': `${i * 30}deg` } as CSSProperties} />
            ))}
            <span className="quest-xp-float font-display text-3xl font-black text-primary">+{CHEST_XP} XP</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : quests.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">{t('profile.quests.emptyShort')}</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((quest, index) => {
            const pct = Math.min((quest.progress / quest.target) * 100, 100);
            const QuestIcon = QUEST_ICONS[quest.quest_type] ?? Target;
            const done = quest.completed;
            const ready = done && !quest.claimed;
            return (
              <div
                key={quest.id}
                data-ready={ready}
                className={`quest-card quest-card-enter relative rounded-3xl bg-card p-4 ${quest.claimed ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {celebrating === quest.id && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className="quest-spark absolute h-2 w-2 rounded-full bg-amber" style={{ '--a': `${i * 36}deg` } as CSSProperties} />
                    ))}
                    <span className="quest-xp-float font-display text-2xl font-black text-primary">+{quest.xp_reward} XP</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="quest-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ '--tile': QUEST_TINTS[quest.quest_type] ?? 'var(--primary)' } as CSSProperties}>
                    {quest.claimed ? <Check className="h-6 w-6" strokeWidth={3} /> : <QuestIcon className="h-6 w-6" strokeWidth={2.3} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[15px] font-display font-black leading-tight text-foreground">{quest.title}</p>
                      {!quest.claimed && <XpPill xp={quest.xp_reward} state="reward" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{quest.description}</p>
                  </div>
                </div>

                {!quest.claimed && (
                  <div className="quest-bar relative mt-3.5 h-5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`quest-progress-fill quest-bar-fill h-full rounded-full ${done ? 'bg-primary' : 'bg-amber'}`}
                      style={{ width: `${Math.max(pct, 6)}%`, animationDelay: `${index * 80 + 150}ms` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-display font-black tabular-nums text-foreground">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                )}

                {quest.quest_type === 'share_app' && !done && !quest.claimed && (
                  <Button size="sm" variant="ghost" onClick={() => handleShareApp(quest.id)} className="game-button game-button-outline mt-3 h-11 w-full text-sm font-display">
                    <Share2 className="h-4 w-4" />{t('profile.quests.share')}
                  </Button>
                )}
                {!done && !quest.claimed && quest.quest_type !== 'share_app' && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(quest.quest_type === 'new_zone' ? '/home?tab=map' : '/capture')} className="game-button game-button-outline mt-3 h-11 w-full text-sm font-display">
                    {quest.quest_type === 'new_zone' ? <MapPin className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    {t(quest.quest_type === 'new_zone' ? 'profile.quests.goExplore' : 'profile.quests.goCapture')}
                  </Button>
                )}
                {ready && (
                  <Button size="sm" variant="ghost" onClick={() => claimWithCelebration(quest.id)} disabled={claiming === quest.id} className="game-button quest-claim-pulse mt-3 h-11 w-full text-sm font-display">
                    {claiming === quest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    {t('profile.quests.claim')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default QuestsInline;
