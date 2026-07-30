import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Target, Gift, Check, Loader2, ArrowLeft, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfWeekISO } from '@/lib/weekUtils';

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

const QuestsPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchQuests = async () => {
    if (!session?.user) return;
    const weekStart = startOfWeekISO();

    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('quest_date', weekStart)
      .order('created_at');

    if (!error && data) {
      setQuests(data as Quest[]);
    }

    if (!error && (!data || data.length === 0)) {
      await supabase.rpc('ensure_weekly_quests');
      const { data: retryData } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('quest_date', weekStart)
        .order('created_at');
      if (retryData) setQuests(retryData as Quest[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQuests();

    if (!session?.user) return;
    const channel = supabase
      .channel('daily-quests-page')
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

    return () => { supabase.removeChannel(channel); };
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

  const handleShareApp = async (questId: string) => {
    const shareData = {
      title: 'Faunex — Attrape-les vraiment tous.',
      text: 'Rejoins-moi sur Faunex 🌿 Capture et collectionne les animaux autour de toi !',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success('Lien copié !');
      }

      // Mark quest as completed
      await supabase
        .from('daily_quests')
        .update({ progress: 1, completed: true })
        .eq('id', questId);

      setQuests(prev => prev.map(q => q.id === questId ? { ...q, progress: 1, completed: true } : q));
      toast.success('Quête complétée ! 🎉');
    } catch (err) {
      // User cancelled share dialog — don't mark as complete
    }
  };

  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
              <Target className="w-4.5 h-4.5 text-amber" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Quêtes de la semaine</h1>
              <p className="text-[11px] text-muted-foreground">
                {completedCount}/{quests.length} terminées
              </p>
            </div>
          </div>
        </div>
      </PageHeader>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : quests.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-foreground font-display font-semibold text-sm mb-2">Aucune quête cette semaine</p>
            <p className="text-muted-foreground text-xs">Les quêtes se renouvellent chaque lundi. Reviens vite !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quests.map((quest, index) => {
              const pct = Math.min((quest.progress / quest.target) * 100, 100);
              return (
                <div
                  key={quest.id}
                  className={`quest-card-enter relative p-4 rounded-2xl border transition-all ${
                    quest.claimed
                      ? 'bg-muted/30 border-border opacity-60'
                      : quest.completed
                      ? 'border-primary/30 bg-primary/5 quest-complete-glow'
                      : questGlowClass[quest.quest_type] || 'bg-card border-border'
                  }`}
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5 quest-icon-bounce" style={{ animationDelay: `${index * 120 + 200}ms` }}>{quest.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-display font-bold text-foreground">
                          {quest.title}
                        </span>
                        <span className="text-xs font-display font-bold text-amber quest-xp-pop" style={{ animationDelay: `${index * 120 + 400}ms` }}>
                          +{quest.xp_reward} XP
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{quest.description}</p>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full quest-progress-fill ${
                              quest.completed ? 'bg-primary' : 'bg-amber'
                            }`}
                            style={{ width: `${pct}%`, animationDelay: `${index * 120 + 300}ms` }}
                          />
                        </div>
                        <span className="text-[11px] font-display font-semibold text-muted-foreground min-w-[2.5rem] text-right">
                          {quest.progress}/{quest.target}
                        </span>
                      </div>
                    </div>

                    {/* Share button for share_app quests */}
                    {quest.quest_type === 'share_app' && !quest.completed && !quest.claimed && (
                      <button
                        onClick={() => handleShareApp(quest.id)}
                        className="shrink-0 mt-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-bold flex items-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Partager
                      </button>
                    )}

                    {quest.completed && !quest.claimed && (
                      <button
                        onClick={() => claimReward(quest.id)}
                        disabled={claiming === quest.id}
                        className="shrink-0 mt-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-bold flex items-center gap-1.5 quest-claim-appear"
                      >
                        {claiming === quest.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Gift className="w-3.5 h-3.5" />
                        )}
                        Récolter
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
    </main>
  );
};

export default QuestsPage;
