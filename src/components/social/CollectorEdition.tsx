import { useTranslation } from 'react-i18next';
import { useContestWinnerCutouts } from '@/hooks/usePhotoContest';

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

/** AI-detected animal silhouette used as a mask: golden aura + depth shadow, photo stays intact. */
export function CollectorSilhouette({ captureId }: { captureId?: string }) {
  const { data: cutouts } = useContestWinnerCutouts();
  const url = captureId ? cutouts?.get(captureId) : undefined;
  if (!url) return null;
  const maskStyle = {
    WebkitMaskImage: `url(${url})`,
    maskImage: `url(${url})`,
  } as const;
  return (
    <div className="collector-silhouette" aria-hidden="true">
      <div className="collector-silhouette__shadow" style={maskStyle} />
      <div className="collector-silhouette__aura" style={maskStyle} />
    </div>
  );
}
