import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')}k` : `${n}`);

/** Jeton discret : nombre d'explorateurs ayant capturé l'espèce. */
export const FindersBadge = ({ count, className }: { count: number; className?: string }) => {
  useTranslation();
  const title = count > 0
    ? i18n.t('bestiary.finders.captured', { count })
    : i18n.t('bestiary.finders.none');
  return (
    <span className={`finders-badge ${className ?? ''}`} title={title}>
      <Users className="finders-badge__icon" strokeWidth={2.2} />
      <span className="finders-badge__count">{fmt(count)}</span>
    </span>
  );
};

export default FindersBadge;
