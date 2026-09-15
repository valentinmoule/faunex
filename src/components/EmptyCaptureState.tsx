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
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-card border border-border/60 p-8 shadow-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-4xl" role="img" aria-label="nature">
            🌿
          </span>
        </div>

        <div className="space-y-1 mb-6 min-h-[5.5rem]" aria-live="polite" aria-atomic="false">
          <p className="text-xl font-display font-bold text-foreground leading-snug">
            {visible[0]}
            {activeLine === 0 && (
              <span className="inline-block w-0.5 h-5 ml-0.5 align-middle bg-primary animate-pulse" aria-hidden="true" />
            )}
          </p>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
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
            w-full flex items-center justify-center gap-2.5
            px-5 py-4 rounded-2xl
            bg-primary text-primary-foreground
            font-display font-bold text-base
            shadow-lg shadow-primary/20
            active:scale-[0.98] transition-all duration-300
            ${done ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
          `}
          aria-label={t('bestiary.emptyCapture.cta')}
        >
          <Camera className="w-5 h-5" />
          {t('bestiary.emptyCapture.cta')}
        </button>
      </div>
    </div>
  );
};

export default EmptyCaptureState;
