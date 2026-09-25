/**
 * Écran de récompense d'un badge : illustration en grand, nom, description,
 * XP dans un tag, et un bouton à presser pour récupérer le badge.
 *
 * Affiché par la ligne Badges de la fenêtre profil et par la page Badges.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Gift, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import BadgeMedallion, { GROUP_HUE } from '@/components/BadgeMedallion';
import type { BadgeProgress } from '@/hooks/useBadges';

const CONFETTI_COLORS = ['#F5B942', '#4CAF6E', '#8E6FD8', '#5B8DEF', '#E86A5B', '#F27FB1'];
const RING_BOX = 212;
const MEDALLION = 176;

interface Props {
  entry: BadgeProgress;
  onClose: () => void;
  /** Appelé après une réclamation réussie : l'appelant met à jour son état local. */
  onClaimed: (entry: BadgeProgress) => void;
}

const BadgeRewardSheet = ({ entry, onClose, onClaimed }: Props) => {
  const { t } = useTranslation();
  const { badge } = entry;
  const hue = GROUP_HUE[badge.group];
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const reduced = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );

  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.9 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 140,
        spin: 320 + Math.random() * 520,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.6,
      })),
    [],
  );

  // Tant que l'écran est ouvert, rien ne défile derrière.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);

  const claim = async () => {
    if (claiming || claimed) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc('claim_badge', {
      p_badge_id: badge.id,
      p_xp_reward: badge.xp,
    });
    setClaiming(false);
    if (error || !data) {
      toast.error(t('profile.reward.error'));
      return;
    }
    setClaimed(true);
    if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
    toast.success(t('profile.reward.toast', { xp: badge.xp }));
    onClaimed(entry);
    window.setTimeout(onClose, reduced ? 200 : 1200);
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-background animate-in fade-in duration-200">
      {/* Teinte pastel de la famille du badge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(115% 55% at 50% 18%, hsl(var(${hue.from}) / 0.22), transparent 68%), radial-gradient(90% 42% at 50% 102%, hsl(var(${hue.to}) / 0.16), transparent 74%)`,
        }}
      />

      {/* Pluie de confettis une fois récupéré */}
      {claimed && !reduced && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {pieces.map((pc) => (
            <span
              key={pc.id}
              className="confetti-piece"
              style={
                {
                  left: `${pc.left}%`,
                  width: pc.size,
                  height: pc.round ? pc.size : pc.size * 0.45,
                  backgroundColor: pc.color,
                  borderRadius: pc.round ? '50%' : '2px',
                  '--confetti-delay': `${pc.delay}s`,
                  '--confetti-duration': `${pc.duration}s`,
                  '--confetti-drift': `${pc.drift}px`,
                  '--confetti-spin': `${pc.spin}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      <header className="relative z-10 flex items-center px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={claiming}
          aria-label={t('profile.reward.close')}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-transform active:scale-95 disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Illustration */}
        <div className="relative flex items-center justify-center" style={{ width: RING_BOX, height: RING_BOX }}>
          {!reduced && (
            <>
              <span
                aria-hidden
                className="celebration-ring absolute inset-6 rounded-full border-2"
                style={{ borderColor: `hsl(var(${hue.from}) / 0.35)` }}
              />
              <span
                aria-hidden
                className="celebration-ring absolute inset-6 rounded-full border-2"
                style={{ borderColor: `hsl(var(${hue.to}) / 0.28)`, animationDelay: '0.45s' }}
              />
            </>
          )}
          <BadgeMedallion
            badgeId={badge.id}
            group={badge.group}
            fallbackEmoji={badge.icon}
            state={claimed ? 'claimed' : 'claimable'}
            size={MEDALLION}
            className={reduced ? 'celebration-pop' : 'game-float celebration-pop'}
          />
          {!claimed && (
            <span className="absolute -left-1 top-7 z-10 rounded-[6px] bg-destructive px-2 py-1 text-[10px] font-display font-black uppercase tracking-wide text-destructive-foreground shadow-sm">
              {t('profile.reward.newTag')}
            </span>
          )}
        </div>

        {/* Expérience dans un tag */}
        <span className="celebration-pop mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/10 px-3.5 py-1.5 text-[13px] font-display font-black tabular-nums text-amber">
          <Gift className="size-3.5" />+{badge.xp} XP
        </span>

        <h3 className="mt-3 font-display text-2xl font-black leading-tight text-foreground">
          {badge.name}
        </h3>
        <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          {badge.description}
        </p>
      </div>

      {/* Action */}
      <div className="relative z-10 px-5 pb-8 pt-3">
        <button
          type="button"
          onClick={claim}
          disabled={claiming || claimed}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-4 font-display text-base font-black transition-transform active:scale-[0.98] disabled:opacity-90 ${
            claimed
              ? 'bg-amber text-amber-foreground'
              : 'bg-primary text-primary-foreground shadow-[0_16px_30px_-18px_hsla(var(--primary)/0.85)]'
          }`}
        >
          {claiming && <Loader2 className="size-4 animate-spin" />}
          {claimed && <Check className="size-4" strokeWidth={3} />}
          {claimed
            ? t('profile.reward.claimed')
            : claiming
            ? t('profile.reward.claiming')
            : t('profile.reward.claimCta')}
        </button>
      </div>
    </div>
  );
};

export default BadgeRewardSheet;
