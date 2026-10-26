import { useTranslation } from 'react-i18next';

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

/**
 * Premium holographic foil for prize-winning cards (pure CSS): diagonal
 * cyan/violet/pink/gold gradient (screen) + fine holo texture (soft-light).
 * Driven by the existing HolographicCard pointer/tilt variables.
 */
export function CollectorHoloLayers(_props: { captureId?: string; photoUrl?: string }) {
  return (
    <div className="w-holo" aria-hidden="true">
      <div className="w-holo__sheen" />
      <div className="w-holo__texture" />
      <div className="w-holo__glare" />
    </div>
  );
}

/** AI silhouette removed: kept as a no-op for existing call sites. */
export function CollectorSilhouette(_props: { captureId?: string; photoUrl: string }) {
  return null;
}
