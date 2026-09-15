import { Camera, Crown, Infinity, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCaptureQuota } from '@/hooks/useCaptureQuota';

interface CaptureQuotaBadgeProps {
  userId?: string;
  isPremium: boolean;
}

const CaptureQuotaBadge = ({ userId, isPremium }: CaptureQuotaBadgeProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { remaining } = useCaptureQuota(userId);

  return (
    <div
      className="flex h-9 items-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 shadow-sm"
      aria-label={isPremium ? t('common.unlimitedCaptures') : t('common.captureQuotaRemaining', { count: remaining ?? 0 })}
    >
      <div className="flex min-w-[58px] items-center justify-center gap-1.5 px-2.5 text-primary">
        <Camera className="h-4 w-4" strokeWidth={2.25} />
        {isPremium ? (
          <Infinity className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <span className="text-sm font-display font-bold tabular-nums">
            {remaining === null ? '—' : remaining}
          </span>
        )}
      </div>

      {isPremium ? (
        <div className="flex h-full w-9 items-center justify-center border-l border-primary/20 bg-primary text-primary-foreground" title={t('common.premiumActive')}>
          <Crown className="h-4 w-4" strokeWidth={2.25} />
        </div>
      ) : (
        <Button
          type="button"
          size="icon"
          onClick={() => navigate('/premium')}
          className="h-full w-9 shrink-0 rounded-none border-l border-primary/20 shadow-none"
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