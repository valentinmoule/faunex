import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import { useContestWinnerCaptures } from '@/hooks/usePhotoContest';
import './PhotoOfWeekMark.css';

/** Small emblem shown on a card whose photo won « Photo de la semaine ». */
export default function PhotoOfWeekMark({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      role="img"
      aria-label={t('social.contest.badge')}
      title={t('social.contest.badge')}
      className={`photo-week-mark pointer-events-none h-7 w-7 ${className}`}
    >
      <Camera aria-hidden="true" strokeWidth={2} />
    </span>
  );
}

/** Resolve only the actual displayed capture, never the species identity. */
export function CapturePhotoOfWeekMark({ captureId, className = '' }: { captureId?: string; className?: string }) {
  const { data: winners } = useContestWinnerCaptures();
  if (!captureId || !winners?.has(captureId)) return null;
  return <PhotoOfWeekMark className={className} />;
}
