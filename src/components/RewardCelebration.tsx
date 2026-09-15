import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
}

const CONFETTI_COLORS = ['#F5B942', '#4CAF6E', '#8E6FD8', '#5B8DEF', '#E86A5B', '#F27FB1'];

interface RewardCelebrationProps {
  /** Titre de la récompense (nom de la collection/zone). */
  title: string;
  /** XP gagnés. */
  xp: number;
  onClose: () => void;
}

/**
 * Célébration plein écran affichée lors de la récolte d'une récompense de
 * collection : pluie de confettis, médaillon hexagonal doré, vibration.
 */
const RewardCelebration = ({ title, xp, onClose }: RewardCelebrationProps) => {
  const { t } = useTranslation();

  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 2.1 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 120,
        spin: 360 + Math.random() * 540,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.6,
      })),
    []
  );

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 backdrop-blur-sm px-6 animate-in fade-in"
      onClick={onClose}
    >
      {/* Pluie de confettis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="confetti-piece"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.round ? p.size : p.size * 0.45,
                backgroundColor: p.color,
                borderRadius: p.round ? '50%' : '2px',
                '--confetti-delay': `${p.delay}s`,
                '--confetti-duration': `${p.duration}s`,
                '--confetti-drift': `${p.drift}px`,
                '--confetti-spin': `${p.spin}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Carte de célébration */}
      <div
        className="relative w-full max-w-[300px] rounded-[28px] bg-card border border-amber/30 shadow-[0_30px_60px_-25px_hsla(38,92%,56%,0.55)] px-6 pt-8 pb-6 text-center game-card-appear"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-amber/12 px-2.5 py-1 text-[11px] font-display font-bold text-amber celebration-pop">
          <Trophy className="w-3 h-3" /> +{xp} XP
        </span>

        {/* Médaillon hexagonal doré avec anneaux pulsants */}
        <div className="relative mx-auto mb-4 w-[120px] h-[120px] flex items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-amber/40 celebration-ring" />
          <span className="absolute inset-0 rounded-full border-2 border-amber/25 celebration-ring" style={{ animationDelay: '0.4s' }} />
          <div
            className="w-[104px] h-[104px] flex items-center justify-center celebration-pop"
            style={{
              clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
              background: 'linear-gradient(160deg, hsl(42 92% 62%), hsl(36 88% 46%))',
              boxShadow: '0 12px 30px -10px hsla(38,92%,50%,0.7)',
            }}
          >
            <div
              className="w-[92px] h-[92px] flex items-center justify-center"
              style={{
                clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                background: 'linear-gradient(160deg, hsl(46 95% 70%), hsl(38 90% 52%))',
              }}
            >
              <Trophy className="w-11 h-11 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" strokeWidth={2.2} />
            </div>
          </div>
        </div>

        <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-amber">
          {t('bestiary.collections.celebrationTag', { defaultValue: 'Collection complète !' })}
        </p>
        <h4 className="mt-1 font-display text-lg font-black text-foreground">{title}</h4>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t('bestiary.collections.celebrationDesc', {
            xp,
            defaultValue: `Tu as récolté ${xp} XP. Continue d'explorer pour compléter d'autres collections !`,
          })}
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-primary px-4 py-3 font-display text-sm font-bold text-primary-foreground active:scale-95 transition-transform"
        >
          {t('profile.badges.celebrateCta', { defaultValue: 'Super !' })}
        </button>
      </div>
    </div>
  );
};

export default RewardCelebration;
