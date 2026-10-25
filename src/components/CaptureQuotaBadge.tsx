import { Camera, Crown, Infinity as InfinityIcon, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCaptureQuota } from '@/hooks/useCaptureQuota';

interface CaptureQuotaBadgeProps {
  userId?: string;
  isPremium: boolean;
  /** Vrai tant que l'état premium n'est pas connu : on n'affiche jamais le
   *  chiffre pendant ce chargement, sinon un premium voit brièvement
   *  « N » avant que le symbole ∞ n'apparaisse. */
  premiumLoading?: boolean;
}

const CaptureQuotaBadge = ({ userId, isPremium, premiumLoading }: CaptureQuotaBadgeProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { remaining } = useCaptureQuota(userId);

  return (
    <div
      className="capture-game-counter flex h-9 shrink-0 items-center gap-1.5 pl-1 pr-1"
      aria-label={isPremium ? t('common.unlimitedCaptures') : t('common.captureQuotaRemaining', { count: remaining ?? 0 })}
    >
      <div className="flex min-w-[58px] items-center justify-center gap-1.5 text-primary">
        <span className="capture-game-emblem flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
          <Camera className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </span>
        {isPremium ? (
          <InfinityIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        ) : premiumLoading ? (
          <span className="w-5" aria-hidden="true" />
        ) : (
          <span className="text-sm font-display font-extrabold tabular-nums">
            {remaining === null ? '—' : remaining}
          </span>
        )}
      </div>

      {isPremium ? (
        <div className="capture-game-premium flex h-7 w-7 items-center justify-center" title={t('common.premiumActive')}>
          <Crown className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/premium')}
          className="capture-game-add h-7 w-7 shrink-0 rounded-lg p-0"
          aria-label={t('common.goPremium')}
          title={t('common.goPremium')}
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
        </Button>
      )}
    </div>
  );
};

export default CaptureQuotaBadge;