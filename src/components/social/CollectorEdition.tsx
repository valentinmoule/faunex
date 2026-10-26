import { useId } from 'react';
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

/** A single restrained reflection; no full-photo gold veil or sparkles. */
export function CollectorHoloLayers() {
  return <div className="collector-shine-bar" aria-hidden="true" />;
}

/** AI-detected animal silhouette used as a mask: golden aura + depth shadow, photo stays intact. */
export function CollectorSilhouette({ captureId }: { captureId?: string }) {
  const filterId = `collector-outline-${useId().replace(/:/g, '')}`;
  const { data: cutouts } = useContestWinnerCutouts();
  const url = captureId ? cutouts?.get(captureId) : undefined;
  if (!url) return null;
  return (
    <svg className="collector-silhouette" width="100%" height="100%" aria-hidden="true">
      <defs>
        <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="expanded" />
          <feGaussianBlur in="expanded" stdDeviation="4" result="softEdge" />
          <feComposite in="softEdge" in2="SourceAlpha" operator="out" result="outerEdge" />
          <feFlood className="collector-outline-gold" floodOpacity="0.48" result="gold" />
          <feComposite in="gold" in2="outerEdge" operator="in" result="halo" />
          <feOffset in="SourceAlpha" dy="3" result="offset" />
          <feGaussianBlur in="offset" stdDeviation="3" result="softShadow" />
          <feComposite in="softShadow" in2="SourceAlpha" operator="out" result="outerShadow" />
          <feFlood className="collector-outline-shadow" floodOpacity="0.22" result="shadowColor" />
          <feComposite in="shadowColor" in2="outerShadow" operator="in" result="shadow" />
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="halo" /></feMerge>
        </filter>
      </defs>
      <image href={url} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" filter={`url(#${filterId})`} />
    </svg>
  );
}
