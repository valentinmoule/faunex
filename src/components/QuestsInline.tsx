import { useEffect, useState, type CSSProperties } from 'react';
import {
  Gift, Loader2, Share2, Clock,
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


  const sorted = [...quests].sort((a, b) => (a.period === 'day' ? 1 : 0) - (b.period === 'day' ? 1 : 0));

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
      <h3 id="weekly-quests-title" className="sr-only">{t('profile.quests.weekTitle')}</h3>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
      ) : quests.length === 0 ? (
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
                      <span>{quest.period === 'day' ? t('profile.quests.dailyKicker') : t('profile.quests.weeklyKicker')}</span>
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
        </div>
      )}

    </section>
  );
};

/** Coffre d'expédition sculpté : cuir, renforts dorés, gemme verte. */
function RelicChest({ state }: { state: 'idle' | 'ready' | 'open' | 'locked' }) {
  const open = state === 'open';
  return (
    <svg data-state={state} className="relic-chest h-11 w-12" viewBox="0 0 48 44" aria-hidden>
      <defs>
        <linearGradient id={`rc-wood-${state}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(28 55% 46%)" /><stop offset="1" stopColor="hsl(24 52% 32%)" />
        </linearGradient>
        <linearGradient id={`rc-gold-${state}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--amber-light))" /><stop offset="1" stopColor="hsl(var(--amber-dark))" />
        </linearGradient>
      </defs>
      <rect x="5" y="20" width="38" height="20" rx="4" fill={`url(#rc-wood-${state})`} />
      {open
        ? <path d="M6 20 L10 8 Q24 2 38 8 L42 20 Z" fill={`url(#rc-wood-${state})`} opacity=".85" />
        : <path d="M5 21 V15 Q5 6 24 6 Q43 6 43 15 V21 Z" fill={`url(#rc-wood-${state})`} />}
      <rect x="5" y="19" width="38" height="4" rx="1.5" fill={`url(#rc-gold-${state})`} />
      <rect x="11" y={open ? 9 : 6} width="4" height={open ? 31 : 34} rx="1.5" fill={`url(#rc-gold-${state})`} />
      <rect x="33" y={open ? 9 : 6} width="4" height={open ? 31 : 34} rx="1.5" fill={`url(#rc-gold-${state})`} />
      <rect x="19" y="17" width="10" height="11" rx="2.5" fill={`url(#rc-gold-${state})`} />
      <path d="M24 19.5 L27 22.5 L24 25.5 L21 22.5 Z" fill={state === 'locked' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'} />
      {open && <path d="M18 31 L22 35 L30 27" fill="none" stroke="hsl(var(--card))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      <path d="M8 14 Q24 9 40 14" fill="none" stroke="hsl(var(--card) / .35)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default QuestsInline;
