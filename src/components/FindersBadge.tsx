import { Flame, TrendingUp, Users, Footprints, Ghost } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

type Tier = {
  Icon: typeof Flame;
  title: (n: number) => string;
  showCount: boolean;
};

const naturalistes = (n: number) => i18n.t('bestiary.finders.captured', { count: n });

const tierFor = (n: number): Tier => {
  if (n <= 0)
    return {
      Icon: Ghost,
      title: () => i18n.t('bestiary.finders.none'),
      showCount: true,
    };
  if (n < 5)
    return {
      Icon: Footprints,
      title: naturalistes,
      showCount: true,
    };
  if (n < 25)
    return {
      Icon: Users,
      title: naturalistes,
      showCount: true,
    };
  if (n < 100)
    return {
      Icon: TrendingUp,
      title: naturalistes,
      showCount: true,
    };
  return {
    Icon: Flame,
    title: naturalistes,
    showCount: true,
  };
};

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')}k` : `${n}`);

/** Jeton contextuel indiquant la popularité d'une espèce (du fantôme au feu).
 *  Style neutre : icône + nombre, sans couleur de palier. */
export const FindersBadge = ({ count, className }: { count: number; className?: string }) => {
  useTranslation();
  const tier = tierFor(count);
  const { Icon } = tier;
  return (
    <span className={`finders-badge ${className ?? ''}`} title={tier.title(count)}>
      <Icon className="finders-badge__icon" strokeWidth={2.4} />
      {tier.showCount ? <span className="finders-badge__count">{fmt(count)}</span> : null}
    </span>
  );
};

export default FindersBadge;