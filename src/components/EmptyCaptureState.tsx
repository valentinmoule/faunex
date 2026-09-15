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
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-5 text-center">
      <div className="w-full max-w-xs rounded-[2rem] bg-gradient-to-b from-card to-card/80 border border-primary/10 p-7 shadow-xl shadow-primary/5">
        <div className="relative w-24 h-24 mx-auto mb-5">
          <div className="absolute inset-0 rounded-3xl bg-primary/10 animate-pulse" />
          <div className="absolute inset-0 rounded-3xl bg-primary/5 flex items-center justify-center">
            <span className="text-5xl" role="img" aria-label="nature">
              🌿
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-7 min-h-[6rem]" aria-live="polite" aria-atomic="false">
          <p className="text-2xl font-display font-bold text-foreground leading-tight">
            {visible[0]}
            {activeLine === 0 && (
              <span className="inline-block w-0.5 h-6 ml-1 align-middle bg-primary animate-pulse" aria-hidden="true" />
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
            w-full inline-flex items-center justify-center gap-2
            px-4 py-3.5 rounded-2xl
            bg-primary text-primary-foreground
            font-display font-bold text-sm whitespace-nowrap
            shadow-lg shadow-primary/20
            active:scale-[0.98] transition-all duration-300
            ${done ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
          `}
          aria-label={t('bestiary.emptyCapture.cta')}
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('bestiary.emptyCapture.cta')}</span>
        </button>
      </div>
    </div>
  );
};

export default EmptyCaptureState;
