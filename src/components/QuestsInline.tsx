import { useEffect, useState } from 'react';
import {
  Target, Gift, Check, Loader2, Share2, Camera, Compass, MapPin,
  Sparkles, Trophy, type LucideIcon,
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

const QuestsInline = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

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
      .channel('daily-quests-inline')
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

  

  // Motif répété (empreinte + feuille) utilisé en fond de carte
  const patternSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20c0-4 3-7 6-7s6 3 6 7-3 6-6 6-6-2-6-6z"/><circle cx="7" cy="12" r="2"/><circle cx="13" cy="8" r="2"/><circle cx="20" cy="9" r="2"/><path d="M40 28c-6 0-10 4-10 10 6 0 10-4 10-10z"/><path d="M30 38c4-4 6-6 10-10"/></svg>`,
  );
  const patternStyle = {
    backgroundImage: `url("data:image/svg+xml,${patternSvg}")`,
    backgroundSize: '48px 48px',
  } as const;

  return (
    <section aria-labelledby="weekly-quests-title">
      <div className="mb-4 px-1">
        <h3 id="weekly-quests-title" className="text-xl font-display font-black text-foreground">
          {t('profile.quests.weekTitle')}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : quests.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">{t('profile.quests.emptyShort')}</div>
      ) : (
        <div className="space-y-3">
          {quests.map((quest, index) => {
            const pct = Math.min((quest.progress / quest.target) * 100, 100);
            const QuestIcon = QUEST_ICONS[quest.quest_type] ?? Target;
            const done = quest.completed;
            return (
              <div
                key={quest.id}
                className={`quest-card-enter relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 ${
                  quest.claimed
                    ? 'border-border/70 opacity-70'
                    : done
                    ? 'border-primary/35'
                    : 'border-border'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* motif de fond répété */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 ${done && !quest.claimed ? 'text-primary opacity-[0.09]' : 'text-muted-foreground opacity-[0.05]'}`}
                  style={patternStyle}
                />
                {done && !quest.claimed && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
                )}

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                        done ? 'border-primary/25 bg-primary/12 text-primary' : 'border-border bg-muted/60 text-foreground/70'
                      }`}
                    >
                      <QuestIcon className="h-5 w-5" strokeWidth={2.1} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-display font-black leading-tight text-foreground">
                          {quest.title}
                        </p>
                        <XpPill
                          xp={quest.xp_reward}
                          state={quest.claimed ? 'claimed' : 'reward'}
                        />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`quest-progress-fill h-full rounded-full ${done ? 'bg-primary' : 'bg-amber'}`}
                        style={{ width: `${pct}%`, animationDelay: `${index * 80 + 150}ms` }}
                      />
                    </div>
                    <span className={`shrink-0 text-[10px] font-display font-black tabular-nums ${done ? 'text-primary' : 'text-muted-foreground'}`}>
                      {quest.progress}/{quest.target}
                    </span>
                  </div>

                  {(quest.claimed || (done && !quest.claimed) || (quest.quest_type === 'share_app' && !done)) && (
                    <div className="mt-3 flex justify-end">
                      {quest.quest_type === 'share_app' && !done && !quest.claimed && (
                        <Button size="sm" variant="outline" onClick={() => handleShareApp(quest.id)} className="h-8 rounded-xl px-3 text-xs font-display font-bold">
                          <Share2 className="h-3.5 w-3.5" />
                          {t('profile.quests.share')}
                        </Button>
                      )}
                      {done && !quest.claimed && (
                        <Button size="sm" onClick={() => claimReward(quest.id)} disabled={claiming === quest.id} className="h-8 rounded-xl px-3 text-xs font-display font-bold">
                          {claiming === quest.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
                          {t('profile.quests.claim')}
                        </Button>
                      )}
                      {quest.claimed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-display font-bold text-primary">
                          <Check className="h-3.5 w-3.5" /> {t('profile.badges.unlockedTag')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default QuestsInline;
