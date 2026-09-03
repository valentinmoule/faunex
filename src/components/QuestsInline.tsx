import { useEffect, useState } from 'react';
import { Target, Gift, Check, Loader2, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfWeekISO } from '@/lib/weekUtils';
import { useTranslation } from 'react-i18next';

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

const questGlowClass: Record<string, string> = {
  capture_rarity: 'border-rarity-rare/30 bg-rarity-rare/5',
  capture_count: 'border-primary/20 bg-primary/5',
  capture_different: 'border-amber/20 bg-amber/5',
  new_zone: 'border-sky/20 bg-sky/5',
  share_app: 'border-primary/20 bg-primary/5',
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
      url: window.location.origin,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success(t('profile.quests.linkCopied'));
      }
      await supabase.rpc('complete_share_quest', { p_quest_id: questId });
      setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, progress: 1, completed: true } : q)));
      toast.success(t('profile.quests.shareCompleted'));
    } catch { /* cancelled */ }
  };

  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber/15 border border-amber/25 flex items-center justify-center">
            <Target className="w-4.5 h-4.5 text-amber" />
          </div>
          <h3 className="text-lg font-display font-black text-foreground">{t('profile.quests.weekTitle')}</h3>
        </div>
        <span className="text-[11px] font-display font-semibold text-amber bg-amber/10 border border-amber/20 px-2.5 py-1 rounded-full">
          🎯 {completedCount}/{quests.length}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : quests.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">{t('profile.quests.emptyShort')}</div>
      ) : (
        <div className="space-y-3">
          {quests.map((quest) => {
            const pct = Math.min((quest.progress / quest.target) * 100, 100);
            return (
              <div
                key={quest.id}
                className={`relative p-4 rounded-2xl border transition-all ${
                  quest.claimed
                    ? 'bg-muted/30 border-border opacity-60'
                    : quest.completed
                    ? 'border-primary/30 bg-primary/5'
                    : questGlowClass[quest.quest_type] || 'bg-card border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{quest.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-display font-bold text-foreground">{quest.title}</span>
                      <span className="text-xs font-display font-bold text-amber">+{quest.xp_reward} XP</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{quest.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${quest.completed ? 'bg-primary' : 'bg-amber'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-display font-semibold text-muted-foreground min-w-[2.5rem] text-right">
                        {quest.progress}/{quest.target}
                      </span>
                    </div>
                  </div>
                  {quest.quest_type === 'share_app' && !quest.completed && !quest.claimed && (
                    <button
                      onClick={() => handleShareApp(quest.id)}
                      className="shrink-0 mt-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-bold flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {t('profile.quests.share')}
                    </button>
                  )}
                  {quest.completed && !quest.claimed && (
                    <button
                      onClick={() => claimReward(quest.id)}
                      disabled={claiming === quest.id}
                      className="shrink-0 mt-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-bold flex items-center gap-1.5"
                    >
                      {claiming === quest.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                      {t('profile.quests.claim')}
                    </button>
                  )}
                  {quest.claimed && (
                    <div className="shrink-0 mt-1 p-2">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuestsInline;
