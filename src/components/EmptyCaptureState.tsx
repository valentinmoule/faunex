import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hapticTap } from '@/lib/haptics';

interface EmptyCaptureStateProps {
  userName?: string;
  onCapture: () => void;
}


const useTypewriter = (lines: string[], speed = 22, pause = 240) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lineIndex >= lines.length) {
      setDone(true);
      return;
    }
    if (charIndex < lines[lineIndex].length) {
      const id = window.setTimeout(() => setCharIndex((c) => c + 1), speed);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setLineIndex((i) => i + 1);
      setCharIndex(0);
    }, pause);
    return () => window.clearTimeout(id);
  }, [lineIndex, charIndex, lines, speed, pause]);

  const visible = lines.map((line, i) => {
    if (i < lineIndex) return line;
    if (i === lineIndex) return line.slice(0, charIndex);
    return '';
  });

  const activeLine = done ? -1 : lineIndex;

  return { visible, done, activeLine };
};

export const EmptyCaptureState = ({ userName, onCapture }: EmptyCaptureStateProps) => {
  const { t } = useTranslation();
  const name = userName || t('bestiary.emptyCapture.explorer');
  const lines = [
    t('bestiary.emptyCapture.greeting', { name }),
    t('bestiary.emptyCapture.line1'),
    t('bestiary.emptyCapture.line2'),
  ];
  const { visible, done, activeLine } = useTypewriter(lines, 22, 240);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-full max-w-sm px-2 py-4">
        <div className="relative h-44 mb-7 flex items-center justify-center" aria-hidden="true">
          <span className="swirl-halo absolute w-40 h-40 rounded-full bg-[conic-gradient(from_0deg,hsl(var(--rarity-rare)/0.35),hsl(var(--rarity-very-rare)/0.3),hsl(var(--rarity-illustration-rare)/0.32),hsl(var(--primary)/0.35),hsl(var(--rarity-rare)/0.35))] blur-2xl" />
          {MOCK_CARDS.map((card) => (
            <div
              key={card.key}
              className="swirl-card absolute w-[5.6rem] aspect-[4/5] rounded-2xl overflow-hidden border border-border/50 bg-card shadow-[0_14px_34px_-18px_hsl(var(--foreground)/0.45)]"
              style={{
                ['--swirl-rot' as string]: card.rot,
                ['--swirl-delay' as string]: card.delay,
                marginLeft: card.offsetX,
                marginTop: card.offsetY,
                zIndex: card.z,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(160deg, hsl(var(${card.tone}) / 0.9), hsl(var(${card.tone}) / 0.45) 55%, hsl(var(--card)) 100%)`,
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,hsl(0_0%_100%/0.35)_48%,transparent_60%)]" />
              <div className="absolute inset-x-0 bottom-0 p-2 space-y-1">
                <span className="block h-1.5 w-3/4 rounded-full bg-background/85" />
                <span className="block h-1 w-1/2 rounded-full bg-background/55" />
              </div>
              <span
                className="absolute top-1.5 right-1.5 text-[0.6rem] leading-none font-bold text-background/90"
              >
                {card.symbol}
              </span>
            </div>
          ))}
        </div>


        <div className="space-y-2.5 mb-8 min-h-[6.5rem]" aria-live="polite" aria-atomic="false">
          <p className="text-[1.6rem] font-display font-bold text-foreground leading-tight tracking-tight">
            {visible[0]}
            {activeLine === 0 && (
              <span className="inline-block w-0.5 h-6 ml-1 align-middle bg-primary animate-pulse" aria-hidden="true" />
            )}
          </p>
          <p className="text-[0.95rem] font-body text-foreground/80 leading-relaxed">
            {visible[1]}
            {activeLine === 1 && (
              <span className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-primary/70 animate-pulse" aria-hidden="true" />
            )}
          </p>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            {visible[2]}
            {activeLine === 2 && (
              <span className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-primary/70 animate-pulse" aria-hidden="true" />
            )}
          </p>
        </div>

        <button
          onClick={() => {
            hapticTap();
            onCapture();
          }}
          className={`
            w-full inline-flex items-center justify-center gap-2
            px-4 py-4 rounded-full
            bg-primary text-primary-foreground
            font-display font-semibold text-[0.9rem] leading-none
            shadow-lg shadow-primary/25
            active:scale-[0.98] transition-all duration-300
            ${done ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
          `}
          aria-label={t('bestiary.emptyCapture.cta')}
        >
          <Camera className="w-[1.05rem] h-[1.05rem] shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t('bestiary.emptyCapture.cta')}</span>
        </button>
      </div>
    </div>
  );
};

export default EmptyCaptureState;
