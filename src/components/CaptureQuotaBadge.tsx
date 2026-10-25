import { Infinity as InfinityIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CaptureIcon from '@/components/CaptureIcon';
import GameCounter from '@/components/GameCounter';
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
    <GameCounter
      icon={<CaptureIcon className="h-[18px] w-[18px]" />}
      value={
        isPremium ? (
          <InfinityIcon className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
        ) : premiumLoading ? (
          <span className="w-5" aria-hidden="true" />
        ) : (
          (remaining === null ? '—' : remaining)
        )
      }
      label={isPremium ? t('common.unlimitedCaptures') : t('common.captureQuotaRemaining', { count: remaining ?? 0 })}
      title={isPremium ? t('common.premiumActive') : t('common.goPremium')}
      onClick={isPremium ? undefined : () => navigate('/premium')}
    />
  );
};

export default CaptureQuotaBadge;
