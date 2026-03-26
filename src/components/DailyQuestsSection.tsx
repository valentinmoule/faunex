import { useState, useEffect } from 'react';
import { Target, Gift, Check, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
};

const DailyQuestsSection = () => {
  const { session } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchQuests = async () => {
    if (!session?.user) return;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('quest_date', today)
      .order('created_at');

    if (!error && data) {
      setQuests(data as Quest[]);
    }

    // If no quests for today, trigger generation for this user
    if (!error && (!data || data.length === 0)) {
      await supabase.functions.invoke('generate-daily-quests');
      // Re-fetch
      const { data: retryData } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('quest_date', today)
        .order('created_at');
      if (retryData) setQuests(retryData as Quest[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQuests();

    if (!session?.user) return;
    // Realtime updates for quest progress
    const channel = supabase
      .channel('daily-quests-progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_quests',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          setQuests((prev) =>
            prev.map((q) =>
              q.id === (payload.new as Quest).id ? { ...q, ...(payload.new as Quest) } : q
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const claimReward = async (questId: string) => {
    setClaiming(questId);
    try {
      const { data, error } = await supabase.rpc('claim_quest_reward', { p_quest_id: questId });
      if (error) throw error;
      if (data) {
        setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, claimed: true } : q)));
        const quest = quests.find((q) => q.id === questId);
        toast.success(`+${quest?.xp_reward || 0} XP récoltés ! 🎉`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la réclamation');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-amber" />
          </div>
          <h2 className="text-sm font-display font-bold text-foreground">Quêtes du jour</h2>
        </div>
        <div className="flex items-center justify-center py-6 bg-muted/50 rounded-2xl">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (quests.length === 0) return null;

  const completedCount = quests.filter((q) => q.completed).length;
  const allClaimed = quests.every((q) => q.claimed);

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2.5"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-amber" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-display font-bold text-foreground">Quêtes du jour</h2>
            <p className="text-[10px] text-muted-foreground">
              {completedCount}/{quests.length} terminées
              {allClaimed && ' ✓ Toutes récoltées'}
            </p>
          </div>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="space-y-2">
          {quests.map((quest) => {
            const pct = Math.min((quest.progress / quest.target) * 100, 100);
            return (
              <div
                key={quest.id}
                className={`relative p-3 rounded-xl border transition-all ${
                  quest.claimed
                    ? 'bg-muted/30 border-border opacity-60'
                    : quest.completed
                    ? 'border-primary/30 bg-primary/5 quest-complete-glow'
                    : questGlowClass[quest.quest_type] || 'bg-muted/50 border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{quest.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-display font-semibold text-foreground">
                        {quest.title}
                      </span>
                      <span className="text-[10px] font-display font-bold text-amber">
                        +{quest.xp_reward} XP
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">{quest.description}</p>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            quest.completed ? 'bg-primary' : 'bg-amber'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-display text-muted-foreground min-w-[2rem] text-right">
                        {quest.progress}/{quest.target}
                      </span>
                    </div>
                  </div>

                  {/* Claim button */}
                  {quest.completed && !quest.claimed && (
                    <button
                      onClick={() => claimReward(quest.id)}
                      disabled={claiming === quest.id}
                      className="shrink-0 mt-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-display font-bold flex items-center gap-1 quest-claim-pulse"
                    >
                      {claiming === quest.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Gift className="w-3 h-3" />
                      )}
                      Récolter
                    </button>
                  )}
                  {quest.claimed && (
                    <div className="shrink-0 mt-1 p-1.5">
                      <Check className="w-4 h-4 text-primary" />
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

export default DailyQuestsSection;
