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

/** Gold « ✦ W » symbol shown next to the species name on collector edition cards. */
export function CollectorEditionMark({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      role="img"
      aria-label={t('social.contest.badge')}
      title={t('social.contest.badge')}
      className={`collector-mark pointer-events-none ${className}`}
    >
      <span aria-hidden="true">✦</span>
      <span aria-hidden="true">W</span>
    </span>
  );
}

/** Animated ultra-gold holographic layers for collector edition cards. */
export function CollectorHoloLayers() {
  return (
    <>
      <div className="collector-holo" aria-hidden="true" />
      <div className="collector-shine-bar" aria-hidden="true" />
      <div className="collector-sparkles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => <span key={i} />)}
      </div>
    </>
  );
}

/** AI background-removed animal layered above the photo for a pop-out depth effect. */
export function CollectorCutout({ captureId }: { captureId?: string }) {
  const { data: cutouts } = useContestWinnerCutouts();
  const url = captureId ? cutouts?.get(captureId) : undefined;
  if (!url) return null;
  return (
    <div className="collector-cutout" aria-hidden="true">
      <img src={url} alt="" loading="lazy" decoding="async" draggable={false} />
    </div>
  );
}
