import { memo, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { type Rarity, RARITY_RANK } from '@/data/mockData';
import { rarityTileBorder } from '@/lib/bestiary';
import { RarityBadge } from '@/components/RarityBadge';
import type { AnimalResult } from '@/types/capture';
import type { RevealPhase } from '@/hooks/useCaptureReveal';
import { revealTimings } from '@/hooks/useCaptureReveal';

type Finish = 'plain' | 'gold' | 'iridescent';

const PALETTES: Record<Finish, string[]> = {
  plain: ['hsl(145 63% 49%)', 'hsl(145 70% 62%)', 'hsl(215 15% 92%)', 'hsl(48 96% 64%)', 'hsl(200 85% 62%)'],
  gold: ['hsl(45 100% 62%)', 'hsl(40 95% 52%)', 'hsl(52 100% 86%)', 'hsl(34 90% 46%)', 'hsl(0 0% 100%)'],
  iridescent: ['hsl(326 80% 72%)', 'hsl(190 90% 66%)', 'hsl(280 70% 72%)', 'hsl(48 100% 72%)', 'hsl(0 0% 100%)', 'hsl(215 30% 88%)'],
};

/** Générateur déterministe : mêmes particules à chaque rendu, aucun saut visuel. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

interface Props {
  phase: RevealPhase;
  rarity: Rarity;
  animal: AnimalResult | null;
  photo: string | null;
  onSkip: () => void;
}

/**
 * Révélation plein écran façon lootbox : la carte tremble de plus en plus,
 * puis se retourne dans un flash avec onde de choc, confettis et rayons.
 * Intensité proportionnelle au rang de rareté (0 → 7). Uniquement transform/opacity.
 */
const RevealStage = ({ phase, rarity, animal, photo, onSkip }: Props) => {
  const { t } = useTranslation();
  const rank = RARITY_RANK[rarity] ?? 0;
  const finish = (rarityTileBorder[rarity] || 'tile-border-plain').replace('tile-border-', '') as Finish;
  const timings = revealTimings(rarity);

  const confetti = useMemo(() => {
    const rnd = seeded(97 + rank * 13);
    const palette = PALETTES[finish];
    const count = 12 + rank * 8;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rnd() * 0.5;
      const dist = 110 + rnd() * (120 + rank * 22);
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 40,
        fall: 140 + rnd() * 220,
        rot: (rnd() - 0.5) * 900,
        delay: rnd() * 120,
        dur: 1100 + rnd() * 700,
        w: 5 + rnd() * 5,
        h: rnd() > 0.5 ? 10 + rnd() * 6 : 6 + rnd() * 4,
        round: rnd() > 0.7,
        color: palette[i % palette.length],
      };
    });
  }, [rank, finish]);

  const sparks = useMemo(() => {
    const rnd = seeded(31 + rank);
    const count = 6 + rank * 2;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 360 + rnd() * 20;
      return { angle, dist: 140 + rnd() * 90, delay: rnd() * timings.charge * 0.7, size: 3 + rnd() * 3 };
    });
  }, [rank, timings.charge]);

  const twinkles = useMemo(() => {
    if (rank < 3) return [];
    const rnd = seeded(211 + rank);
    return Array.from({ length: rank * 2 }, () => ({
      x: 8 + rnd() * 84,
      y: 12 + rnd() * 60,
      delay: 300 + rnd() * 1400,
      s: 0.6 + rnd() * 0.9,
    }));
  }, [rank]);

  if (phase !== 'charging' && phase !== 'burst') return null;

  const label = rank >= 6 ? t('capture.identify.legendary') : rank >= 3 ? t('capture.identify.exceptional') : rank >= 2 ? t('capture.identify.shining') : t('capture.identify.identifying');

  const vars = {
    '--rv-charge': `${timings.charge}ms`,
    '--rv-amp': `${2 + rank * 1.4}deg`,
    '--rv-flash': 0.45 + rank * 0.075,
    '--rv-frame': `var(--rarity-frame-${finish === 'plain' ? 'neutral' : finish})`,
  } as CSSProperties;

  return (
    <div
      className={`reveal-stage rv-${finish} ${phase === 'burst' && rank >= 5 ? 'rv-quake' : ''}`}
      style={vars}
      onClick={onSkip}
      role="presentation"
    >
      <div className={`rv-backdrop ${phase === 'burst' ? 'is-burst' : ''}`} style={{ opacity: 0.55 + rank * 0.05 }} />

      {rank >= 2 && (
        <div className={`rv-rays ${phase === 'burst' ? 'is-burst' : ''}`} style={{ opacity: Math.min(0.25 + rank * 0.1, 0.9) }}>
          <div className="rv-rays-inner" />
          {rank >= 6 && <div className="rv-rays-inner rv-rays-reverse" />}
        </div>
      )}

      {/* Montée : étincelles aspirées vers la carte */}
      {phase === 'charging' && (
        <div className="rv-center">
          {sparks.map((s, i) => (
            <span
              key={i}
              className="rv-spark"
              style={{ '--a': `${s.angle}deg`, '--d': `${s.dist}px`, '--delay': `${s.delay}ms`, width: s.size, height: s.size } as CSSProperties}
            />
          ))}
          <div className="rv-charge-ring" />
        </div>
      )}

      {/* Explosion */}
      {phase === 'burst' && (
        <>
          <div className="rv-flash" />
          {rank >= 6 && <div className="rv-flash rv-flash-2" />}
          <div className="rv-center">
            {Array.from({ length: 1 + Math.floor(rank / 3) }).map((_, i) => (
              <span key={i} className="rv-shock" style={{ animationDelay: `${i * 140}ms` }} />
            ))}
            {confetti.map((c, i) => (
              <span
                key={i}
                className="rv-confetti"
                style={{
                  '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--fall': `${c.fall}px`, '--rot': `${c.rot}deg`,
                  animationDelay: `${c.delay}ms`, animationDuration: `${c.dur}ms`,
                  width: c.w, height: c.h, background: c.color, borderRadius: c.round ? '50%' : '2px',
                } as CSSProperties}
              />
            ))}
          </div>
          {twinkles.map((tw, i) => (
            <span key={i} className="rv-twinkle" style={{ left: `${tw.x}%`, top: `${tw.y}%`, animationDelay: `${tw.delay}ms`, '--s': tw.s } as CSSProperties}>✦</span>
          ))}
        </>
      )}

      <div className="rv-content">
        <div className="rv-card-slot">
          {phase === 'charging' ? (
            <div className="rv-card rv-card-back">
              <div className="rv-card-back-inner">
                {photo && <img src={photo} alt="" className="rv-back-photo" />}
                <span className="rv-question">?</span>
              </div>
            </div>
          ) : (
            <div className="rv-card rv-card-front">
              <div className="rv-card-front-inner">
                {photo && <img src={photo} alt="" />}
                {rank >= 3 && <span className="rv-shine" />}
              </div>
            </div>
          )}
        </div>

        {phase === 'charging' ? (
          <p className="rv-label">{label}</p>
        ) : (
          animal && (
            <div className="rv-texts">
              <div className="rv-stars">
                <RarityBadge rarity={rarity} showLabel className="capture-result-rarity" />
              </div>
              <h2 className="rv-name font-display">{animal.animal_name}</h2>
              <p className="rv-sci">{animal.scientific_name}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default memo(RevealStage);
