import { Flame, TrendingUp, Users, Footprints, Ghost } from 'lucide-react';

type Tier = {
  Icon: typeof Flame;
  label: string;
  title: (n: number) => string;
  className: string;
  showCount: boolean;
};

const naturalistes = (n: number) => `${n} naturaliste${n > 1 ? 's' : ''} ont capturé cette espèce`;

const tierFor = (n: number): Tier => {
  if (n <= 0)
    return {
      Icon: Ghost,
      label: 'Jamais vue',
      title: () => 'Personne ne l’a encore capturée — sois le premier !',
      className: 'finders-badge--none',
      showCount: false,
    };
  if (n < 5)
    return {
      Icon: Footprints,
      label: 'Rarissime',
      title: naturalistes,
      className: 'finders-badge--rare',
      showCount: true,
    };
  if (n < 25)
    return {
      Icon: Users,
      label: '',
      title: naturalistes,
      className: 'finders-badge--common',
      showCount: true,
    };
  if (n < 100)
    return {
      Icon: TrendingUp,
      label: '',
      title: naturalistes,
      className: 'finders-badge--trending',
      showCount: true,
    };
  return {
    Icon: Flame,
    label: '',
    title: naturalistes,
    className: 'finders-badge--hot',
    showCount: true,
  };
};

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')}k` : `${n}`);

/** Jeton contextuel indiquant la popularité d'une espèce (du fantôme au feu). */
export const FindersBadge = ({ count, className }: { count: number; className?: string }) => {
  const tier = tierFor(count);
  const { Icon } = tier;
  return (
    <span className={`finders-badge ${tier.className} ${className ?? ''}`} title={tier.title(count)}>
      <Icon className="finders-badge__icon" strokeWidth={2.4} />
      {tier.showCount ? <span className="finders-badge__count">{fmt(count)}</span> : null}
      {tier.label ? <span className="finders-badge__label">{tier.label}</span> : null}
    </span>
  );
};

export default FindersBadge;
