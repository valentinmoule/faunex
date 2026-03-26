import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const DailyQuestPopup = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'hidden' | 'in' | 'visible' | 'out'>('hidden');

  useEffect(() => {
    if (!session?.user) return;

    const key = `faunex_quest_popup_${session.user.id}_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    const timer = setTimeout(() => {
      setVisible(true);
      setPhase('in');
      setTimeout(() => setPhase('visible'), 50);
    }, 100);

    return () => clearTimeout(timer);
  }, [session]);

  const dismiss = () => {
    setPhase('out');
    setTimeout(() => setVisible(false), 400);
  };

  const goToQuests = () => {
    dismiss();
    setTimeout(() => navigate('/quests'), 300);
  };

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[90] flex items-center justify-center px-6 transition-all duration-400
      ${phase === 'in' || phase === 'hidden' ? 'opacity-0' : phase === 'out' ? 'opacity-0' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className={`relative z-10 w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl overflow-hidden transition-all duration-500 ease-out
        ${phase === 'visible' ? 'scale-100 translate-y-0' : phase === 'out' ? 'scale-90 translate-y-8' : 'scale-75 translate-y-12'}`}>
        
        {/* Close button */}
        <button onClick={dismiss} className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Animated top glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-32 game-quest-sweep pointer-events-none opacity-40" />

        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center">
          {/* Animated icon */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber/20 to-amber/10 border border-amber/30 flex items-center justify-center quest-popup-bounce">
              <Target className="w-9 h-9 text-amber" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-amber/60 animate-pulse" style={{ animationDelay: '500ms' }} />
          </div>

          <h3 className="text-lg font-display font-black text-foreground mb-1.5">
            🎯 Quêtes du jour
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            De nouvelles quêtes t'attendent !<br />
            Complète-les pour gagner de l'XP et monter de niveau.
          </p>

          <button
            onClick={goToQuests}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber to-amber-light text-white font-display font-bold text-sm shadow-[0_4px_15px_hsla(42,85%,55%,0.3)] hover:shadow-[0_6px_20px_hsla(42,85%,55%,0.4)] transition-all active:scale-[0.97] transform"
          >
            Découvrir mes quêtes
          </button>

          <button onClick={dismiss} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors font-display">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyQuestPopup;
