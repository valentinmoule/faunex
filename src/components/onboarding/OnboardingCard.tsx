import { useTranslation } from 'react-i18next';
import { X, Sparkles } from 'lucide-react';
import meadow from '@/assets/collections/meadow.jpg';

interface Props { onOpen: () => void; onDismiss: () => void }

const OnboardingCard = ({ onOpen, onDismiss }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="relative mb-4 overflow-hidden rounded-3xl">
      <img src={meadow} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/55 to-foreground/10" />
      <button onClick={onDismiss} aria-label={t('onboarding.card.dismiss')} className="absolute right-3 top-3 rounded-full p-1 text-primary-foreground/80">
        <X className="h-4 w-4" />
      </button>
      <div className="relative p-5 pr-10">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground/80">
          <Sparkles className="h-3.5 w-3.5" /> {t('onboarding.card.eyebrow')}
        </p>
        <p className="mt-1.5 font-display text-lg font-bold leading-snug text-primary-foreground">{t('onboarding.card.title')}</p>
        <p className="mt-1 text-sm text-primary-foreground/85">{t('onboarding.card.text')}</p>
        <button onClick={onOpen} className="mt-3 rounded-full bg-primary-foreground px-4 py-2 font-display text-sm font-bold text-foreground">
          {t('onboarding.card.cta')}
        </button>
      </div>
    </div>
  );
};

export default OnboardingCard;
