import { useEffect, useState, type CSSProperties } from 'react';
import {
  Gift, Loader2, Share2, Clock, Crown, Lock,
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
import chestClosedArt from '@/assets/quests/chest-closed.webp';
import { useSubscription } from '@/hooks/useSubscription';
import chestOpenArt from '@/assets/quests/chest-open.webp';
import RewardBurst from '@/components/rewards/RewardBurst';
import { useQueryClient } from '@tanstack/react-query';
import { pendingRewardsKey } from '@/hooks/usePendingQuestRewards';
import { hapticSuccess } from '@/lib/haptics';

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
  period: string | null;
}

const QuestsInline = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [burstXp, setBurstXp] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { isPremium, loading: premiumLoading } = useSubscription(session?.user?.id);
  const [premiumPreview, setPremiumPreview] = useState<{ description: string; target: number; xp_reward: number } | null>(null);

  useEffect(() => {
    if (!session?.user || premiumLoading || isPremium) return;
    supabase.rpc('premium_quest_preview').then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setPremiumPreview(row);
    });
  }, [session, isPremium, premiumLoading]);

  useEffect(() => { if (isPremium) void fetchQuests(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  const fetchQuests = async () => {
    if (!session?.user) return;
    await supabase.rpc('ensure_weekly_quests');
    const { data, error } = await supabase
      .from('weekly_quests').select('*')
      .eq('user_id', session.user.id)
      .gte('quest_date', startOfWeekISO())
      .order('created_at');
    if (!error && data) setQuests(data as Quest[]);
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
        queryClient.invalidateQueries({ queryKey: pendingRewardsKey(session?.user?.id) });
        hapticSuccess();
        setBurstXp(quest?.xp_reward ?? 0);
        window.setTimeout(() => setBurstXp(null), 1900);
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


  const rank = (p: string | null) => (p === 'day' ? 2 : p === 'premium' ? 1 : 0);
  const sorted = quests.filter((q) => !q.claimed).sort((a, b) => rank(a.period) - rank(b.period));

  // Fin de semaine : lundi suivant 00:00 (heure locale)
  const [y, m, d] = startOfWeekISO().split('-').map(Number);
  const msLeft = new Date(y, m - 1, d + 7).getTime() - Date.now();
  const daysLeft = Math.floor(msLeft / 86_400_000);
  const hoursLeft = Math.max(1, Math.floor((msLeft % 86_400_000) / 3_600_000));
  const endsIn = daysLeft > 0 ? t('profile.quests.endsInDays', { d: daysLeft, h: hoursLeft }) : t('profile.quests.endsInHours', { h: hoursLeft });
  const now = new Date();
  const msDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
  const dayH = Math.floor(msDay / 3_600_000);
  const dayLeft = dayH > 0 ? t('profile.quests.endsInHours', { h: dayH }) : t('profile.quests.endsInMinutes', { m: Math.max(1, Math.floor(msDay / 60_000)) });

  return (
    <section aria-labelledby="weekly-quests-title" className="space-y-3">
      {burstXp !== null && <RewardBurst xp={burstXp} />}
      <h3 id="weekly-quests-title" className="sr-only">{t('profile.quests.weekTitle')}</h3>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">{t('profile.quests.emptyShort')}</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((quest, index) => {
            const pct = Math.min((quest.progress / quest.target) * 100, 100);
            const done = quest.completed;
            const ready = done && !quest.claimed;
            return (
              <div key={quest.id} data-ready={ready} className={`mission-plate quest-card-enter overflow-hidden rounded-3xl p-4 ${quest.claimed ? 'opacity-60' : ''}`} style={{ animationDelay: `${index * 80}ms` }}>
                {celebrating === quest.id && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className="quest-spark absolute h-2 w-2 rounded-full bg-amber" style={{ '--a': `${i * 36}deg` } as CSSProperties} />
                    ))}
                    <span className="quest-xp-float font-display text-2xl font-black text-primary">+{quest.xp_reward} XP</span>
                  </div>
                )}
                <div className="relative flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-display font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                      {quest.period === 'premium' ? <span className="inline-flex items-center gap-1 text-amber"><Crown className="h-3 w-3" />{t('premiumFeatures.quest.kicker')}</span> : <span>{quest.period === 'day' ? t('profile.quests.dailyKicker') : t('profile.quests.weeklyKicker')}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{quest.period === 'day' ? dayLeft : endsIn}</span>
                    </div>
                    <p className="mt-1 text-[15px] font-display font-black leading-tight text-foreground">{quest.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="mission-gauge h-2.5 flex-1 overflow-hidden rounded-full">
                        <div className="mission-gauge-fill h-full rounded-full" style={{ width: `${quest.claimed ? 100 : Math.max(pct, 4)}%` }} />
                      </div>
                      <span className="text-[11px] font-display font-black tabular-nums text-foreground">{Math.min(quest.progress, quest.target)}/{quest.target}</span>
                    </div>
                  </div>
                  <div className="flex w-14 shrink-0 flex-col items-center gap-0.5">
                    <RelicChest state={quest.claimed ? 'open' : ready ? 'ready' : 'idle'} />
                    <span className="text-[10px] font-display font-black text-amber">+{quest.xp_reward} XP</span>
                  </div>
                </div>
                {quest.quest_type === 'share_app' && !done && !quest.claimed && (
                  <Button size="sm" variant="ghost" onClick={() => handleShareApp(quest.id)} className="game-button game-button-outline relative mt-3 h-10 w-full text-sm font-display">
                    <Share2 className="h-4 w-4" />{t('profile.quests.share')}
                  </Button>
                )}
                {ready && (
                  <Button size="sm" variant="ghost" onClick={() => claimWithCelebration(quest.id)} disabled={claiming === quest.id} className="game-button quest-claim-pulse relative mt-3 h-10 w-full text-sm font-display">
                    {claiming === quest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    {t('profile.quests.claim')}
                  </Button>
                )}
              </div>
            );
          })}
          {!isPremium && premiumPreview && (
            <div className="mission-plate quest-card-enter overflow-hidden rounded-3xl p-4" style={{ animationDelay: `${sorted.length * 80}ms` }}>
              <div className="relative flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-display font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-amber"><Crown className="h-3 w-3" />{t('premiumFeatures.quest.kicker')}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{endsIn}</span>
                  </div>
                  <p className="mt-1 text-[15px] font-display font-black leading-tight text-foreground">{premiumPreview.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="mission-gauge h-2.5 flex-1 overflow-hidden rounded-full" />
                    <span className="inline-flex items-center gap-1 text-[11px] font-display font-black text-muted-foreground"><Lock className="h-3 w-3" />0/{premiumPreview.target}</span>
                  </div>
                </div>
                <div className="flex w-14 shrink-0 flex-col items-center gap-0.5 grayscale">
                  <RelicChest state="locked" />
                  <span className="text-[10px] font-display font-black text-muted-foreground">+{premiumPreview.xp_reward} XP</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate('/premium')} className="game-button game-button-outline relative mt-3 h-10 w-full text-sm font-display">
                <Crown className="h-4 w-4 text-amber" />{t('premiumFeatures.quest.unlock')}
              </Button>
            </div>
          )}
        </div>
      )}

    </section>
  );
};

/** Coffre d'expédition en cuir feutré, même facture que la mascotte. */
function RelicChest({ state }: { state: 'idle' | 'ready' | 'open' | 'locked' }) {
  return (
    <img
      src={state === 'open' ? chestOpenArt : chestClosedArt}
      data-state={state}
      alt=""
      aria-hidden
      width={48}
      height={48}
      className="relic-chest h-12 w-12 object-contain"
    />
  );
}

export default QuestsInline;
