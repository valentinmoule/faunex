import { useState, useEffect, useRef } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LevelSplash = () => {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [level, setLevel] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpToNext, setXpToNext] = useState(1000);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!session?.user) return;

    // Only show once per day
    const today = new Date().toISOString().split('T')[0];
    const key = `faunex_splash_${session.user.id}_${today}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('level, xp, xp_to_next, display_name, username')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!data) return;

      setLevel(data.level);
      setXp(data.xp);
      setXpToNext(data.xp_to_next);
      setDisplayName(data.display_name || data.username || '');
      setVisible(true);
      setPhase('in');

      // Hold for 2.5s then fade out
      setTimeout(() => setPhase('hold'), 600);
      setTimeout(() => setPhase('out'), 3000);
      setTimeout(() => setVisible(false), 3600);
    };
    load();
  }, [session]);

  if (!visible) return null;

  const progress = xpToNext > 0 ? Math.min((xp / xpToNext) * 100, 100) : 0;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-all duration-500
        ${phase === 'in' ? 'opacity-0 scale-95' : phase === 'hold' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-8">
        {/* Level badge */}
        <div className="level-splash-badge relative w-24 h-24 rounded-2xl bg-primary flex items-center justify-center shadow-glow-amber">
          <Shield className="absolute w-24 h-24 text-primary-foreground/10" />
          <span className="text-4xl font-display font-bold text-primary-foreground">{level}</span>
        </div>

        {/* Name */}
        <p className="text-primary-foreground/60 text-sm font-display">
          {displayName ? `Bienvenue, ${displayName}` : 'Bienvenue, explorateur'}
        </p>

        {/* Level label */}
        <h2 className="text-primary-foreground text-xl font-display font-bold">
          Niveau {level}
        </h2>

        {/* XP bar */}
        <div className="w-56 space-y-1.5">
          <div className="w-full h-2.5 rounded-full bg-primary-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber transition-all duration-1000 ease-out"
              style={{ width: phase !== 'in' ? `${progress}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-display text-primary-foreground/50">
            <span>{xp} XP</span>
            <span>{xpToNext} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelSplash;
