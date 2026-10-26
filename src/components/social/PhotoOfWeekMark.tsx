import { useTranslation } from 'react-i18next';
import photoOfWeekArt from '@/assets/badges/photo_of_week.png';

/** Small emblem shown on a card whose photo won « Photo de la semaine ». */
export default function PhotoOfWeekMark({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <img
      src={photoOfWeekArt}
      alt={t('social.contest.badge')}
      title={t('social.contest.badge')}
      width={36}
      height={36}
      className={`pointer-events-none h-9 w-9 drop-shadow-md ${className}`}
    />
  );
}
