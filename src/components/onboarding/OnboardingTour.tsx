import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, Radar, Trophy, Layers, ArrowRight } from 'lucide-react';
import forest from '@/assets/collections/forest.jpg';
import meadow from '@/assets/collections/meadow.jpg';
import reef from '@/assets/collections/reef.jpg';
import { foxPhoto, foxJump as foxHappy, foxBinoculars as foxLoupe, foxCompass } from '@/assets/mascot';

interface Props { open: boolean; onClose: () => void }

const STEPS = ['concept', 'rules', 'features', 'ready'] as const;
const BACKDROPS = [forest, meadow, reef, forest];
const FOXES: Partial<Record<(typeof STEPS)[number], string>> = {
  concept: foxPhoto,
  rules: foxLoupe,
  features: foxCompass,
  ready: foxHappy,
};

const OnboardingTour = ({ open, onClose }: Props) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const touchX = useRef<number | null>(null);
  if (!open) return null;

  const last = step === STEPS.length - 1;
  const next = () => (last ? onClose() : setStep((s) => s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const key = STEPS[step];

  const rules = t('onboarding.rules.items', { returnObjects: true }) as { title: string; text: string; ok: boolean }[];
  const features = [
    { icon: Radar, k: 'radar' },
    { icon: Trophy, k: 'contest' },
    { icon: Layers, k: 'boosters' },
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.label')}
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx < -50) next(); else if (dx > 50) prev();
      }}
    >
      {/* Visuel */}
      <div className="relative h-[46vh] shrink-0 overflow-hidden">
        <img key={step} src={BACKDROPS[step]} alt="" className="absolute inset-0 h-full w-full object-cover animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-transparent to-background" />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
          <div className="flex flex-1 gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-primary-foreground' : 'bg-primary-foreground/40'}`} />
            ))}
          </div>
          {!last && (
            <button onClick={onClose} className="rounded-full bg-foreground/30 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-md">
              {t('onboarding.skip')}
            </button>
          )}
        </div>
        {FOXES[key] && (
          <img
            key={`fox-${step}`}
            src={FOXES[key]}
            alt=""
            className="absolute bottom-0 left-1/2 h-44 w-44 -translate-x-1/2 object-contain drop-shadow-xl animate-scale-in"
          />
        )}
      </div>

      {/* Texte */}
      <div key={key} className="flex flex-1 flex-col overflow-y-auto px-6 pt-2 animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t(`onboarding.${key}.eyebrow`)}</p>
        <h2 className="mt-2 font-display text-[1.7rem] font-bold leading-tight text-foreground">{t(`onboarding.${key}.title`)}</h2>
        <p className="mt-3 font-body text-[0.95rem] leading-relaxed text-muted-foreground">{t(`onboarding.${key}.text`)}</p>

        {key === 'rules' && (
          <ul className="mt-5 space-y-4">
            {rules.map((r) => (
              <li key={r.title} className="flex gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${r.ok ? 'bg-primary/15 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {r.ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {key === 'features' && (
          <ul className="mt-5 space-y-4">
            {features.map(({ icon: Icon, k }) => (
              <li key={k} className="flex gap-3">
                <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" strokeWidth={1.8} />
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">{t(`onboarding.features.${k}.title`)}</p>
                  <p className="text-sm text-muted-foreground">{t(`onboarding.features.${k}.text`)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
        <Button size="lg" onClick={next} className="w-full">
          {last ? t('onboarding.start') : t('onboarding.next')}
          {!last && <ArrowRight />}
        </Button>
      </div>
    </div>,
    document.body,
  );
};

export default OnboardingTour;
