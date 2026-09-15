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

  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <section aria-labelledby="weekly-quests-title">
      <div className="mb-4 flex items-end justify-between px-1">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-display font-bold uppercase text-primary">
            <Sparkles className="h-3 w-3" />
            {t('profile.quests.progressLabel', { defaultValue: 'Progression' })}
          </div>
          <h3 id="weekly-quests-title" className="text-xl font-display font-black text-foreground">
            {t('profile.quests.weekTitle')}
          </h3>
        </div>
        <div className="text-right">
          <p className="mb-1 text-[9px] font-medium text-muted-foreground">
            {t('profile.quests.completedLabel', { defaultValue: 'Terminées' })}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/10 px-2.5 py-1 text-[11px] font-display font-black text-amber">
            <Trophy className="h-3 w-3" /> {completedCount}/{quests.length}
          </span>
        </div>
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
            const featured = index === 0;
            return (
              <div
                key={quest.id}
                className={`quest-card-enter group relative overflow-hidden border transition-all duration-300 ${
                  featured ? 'rounded-3xl p-5' : 'rounded-2xl p-4'
                } ${
                  quest.claimed
                    ? 'bg-muted/40 border-border opacity-70'
                    : quest.completed
                    ? 'border-primary/40 bg-primary/10 quest-complete-glow'
                    : featured
                    ? 'border-primary/30 bg-foreground text-background shadow-elegant'
                    : 'border-border bg-card shadow-card'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {!quest.claimed && (
                  <div className={`pointer-events-none absolute -right-8 -top-10 rounded-full blur-2xl ${featured ? 'h-28 w-28 bg-primary/25' : 'h-20 w-20 bg-amber/15'}`} />
                )}
                <div className="relative flex items-start gap-3.5">
                  <div className={`flex shrink-0 items-center justify-center border ${featured ? 'h-12 w-12 rounded-2xl border-primary/30 bg-primary/20 text-primary' : 'h-10 w-10 rounded-xl border-amber/25 bg-amber/10 text-amber'}`}>
                    <QuestIcon className={featured ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className={`${featured ? 'text-base' : 'text-sm'} font-display font-black leading-tight ${featured && !quest.claimed ? 'text-background' : 'text-foreground'}`}>
                        {quest.title}
                      </span>
                      <span className="shrink-0 rounded-full border border-amber/25 bg-amber/10 px-2 py-1 text-[10px] font-display font-black text-amber">
                        +{quest.xp_reward} XP
                      </span>
                    </div>
                    <p className={`mb-3 text-xs ${featured && !quest.claimed ? 'text-background/65' : 'text-muted-foreground'}`}>
                      {quest.description}
                    </p>
                    <div className="mb-1.5 flex items-center justify-between text-[9px] font-display font-bold uppercase">
                      <span className={featured && !quest.claimed ? 'text-background/55' : 'text-muted-foreground'}>
                        {t('profile.quests.progressLabel', { defaultValue: 'Progression' })}
                      </span>
                      <span className={quest.completed ? 'text-primary' : 'text-amber'}>{quest.progress}/{quest.target}</span>
                    </div>
                    <div className={`h-2.5 overflow-hidden rounded-full border ${featured && !quest.claimed ? 'border-background/10 bg-background/10' : 'border-border/60 bg-muted'}`}>
                      <div
                        className={`quest-progress-fill h-full rounded-full ${quest.completed ? 'bg-primary' : 'bg-gradient-to-r from-amber to-amber-light'}`}
                        style={{ width: `${pct}%`, animationDelay: `${index * 80 + 150}ms` }}
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      {quest.quest_type === 'share_app' && !quest.completed && !quest.claimed && (
                        <Button size="sm" onClick={() => handleShareApp(quest.id)} className="h-8 rounded-xl px-3 text-xs font-display font-bold">
                          <Share2 className="h-3.5 w-3.5" />
                          {t('profile.quests.share')}
                        </Button>
                      )}
                      {quest.completed && !quest.claimed && (
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
                  </div>
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
