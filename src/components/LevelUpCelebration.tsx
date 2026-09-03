import { useState, useEffect, useCallback } from 'react';
import { Trophy, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const LevelUpCelebration = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [phase, setPhase] = useState<'burst' | 'show' | 'out'>('burst');

  const triggerHaptic = useCallback(() => {
    try {
      if (navigator.vibrate) navigator.vibrate([100, 50, 200, 50, 100]);
    } catch {}
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    // Store the last known level in sessionStorage
    const key = `faunex_level_${session.user.id}`;

    const channel = supabase
      .channel('level-up-watch')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const updatedLevel = (payload.new as any)?.level;
          if (updatedLevel === undefined) return;

          const storedLevel = parseInt(sessionStorage.getItem(key) || '0', 10);
          if (updatedLevel > storedLevel) {
            sessionStorage.setItem(key, String(updatedLevel));
            setNewLevel(updatedLevel);
            setPhase('burst');
            setVisible(true);
            triggerHaptic();

            // Phase transitions
            setTimeout(() => setPhase('show'), 800);
            // Auto-dismiss after 5s
            setTimeout(() => setPhase('out'), 5000);
            setTimeout(() => setVisible(false), 5600);
          } else {
            sessionStorage.setItem(key, String(updatedLevel));
          }
        }
      )
      .subscribe();

    // Set initial level
    supabase
      .from('profiles')
      .select('level')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) sessionStorage.setItem(key, String(data.level));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, triggerHaptic]);

  const dismiss = () => {
    setPhase('out');
    setTimeout(() => setVisible(false), 500);
  };

  if (!visible) return null;

  // XP rewards per level
  const getLevelReward = (lvl: number): string => {
    if (lvl === 1) return t('profile.levelUp.reward1');
    if (lvl <= 3) return t('profile.levelUp.reward3');
    if (lvl <= 5) return t('profile.levelUp.reward5');
    if (lvl <= 10) return t('profile.levelUp.reward10');
    return t('profile.levelUp.rewardMax');
  };

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center transition-all duration-500
        ${phase === 'out' ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/90 backdrop-blur-md" onClick={dismiss} />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="levelup-particle absolute"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${Math.random() * 0.8}s`,
              animationDuration: `${1.5 + Math.random() * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center gap-5 px-8 transition-all duration-700
        ${phase === 'burst' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}
      >

        {/* Stars ring */}
        <div className="relative">
          <div className="levelup-ring w-32 h-32 rounded-full border-4 border-amber flex items-center justify-center bg-amber/10">
            <div className="levelup-badge w-24 h-24 rounded-full bg-gradient-to-br from-amber to-amber-dark flex items-center justify-center shadow-glow-amber">
              <span className="text-5xl font-display font-bold text-foreground">{newLevel}</span>
            </div>
          </div>
          {/* Orbiting stars */}
          {[0, 1, 2, 3].map((i) => (
            <Star
              key={i}
              className="absolute w-4 h-4 text-amber fill-amber levelup-star"
              style={{
                top: `${50 + 45 * Math.sin((i * Math.PI) / 2)}%`,
                left: `${50 + 45 * Math.cos((i * Math.PI) / 2)}%`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div className="text-center">
          <p className="text-amber text-sm font-display font-bold uppercase tracking-widest mb-1">
            {t('profile.levelUp.title')}
          </p>
          <h2 className="text-3xl font-display font-bold text-primary-foreground">
            {t('profile.levelUp.level', { level: newLevel })}
          </h2>
        </div>

        {/* Reward */}
        <div className="flex items-center gap-2.5 bg-primary-foreground/10 rounded-2xl px-5 py-3 max-w-[280px]">
          <Trophy className="w-5 h-5 text-amber shrink-0" />
          <p className="text-sm text-primary-foreground/80 font-display leading-snug">
            {getLevelReward(newLevel)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LevelUpCelebration;
