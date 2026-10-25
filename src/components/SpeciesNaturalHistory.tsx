import { useTranslation } from 'react-i18next';
import { GitBranch, Ruler, Weight } from 'lucide-react';
import { useSpeciesNaturalHistory } from '@/hooks/useSpeciesNaturalHistory';
import DetailRow from '@/components/DetailRow';

// Only documented values are shown: a missing rank or measurement hides its
// row, and a lookup failure hides the block instead of an "unavailable" line.
export default function SpeciesNaturalHistory({ name, scientificName }: { name: string; scientificName?: string }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useSpeciesNaturalHistory(name, scientificName, true);
  const measurement = (value: string) => value.replace(' to ', '–').replace(/\d+(?:\.\d+)?/g, (n) => Number(n).toLocaleString(i18n.language));
  if (isLoading) return <DetailRow icon={<GitBranch className="w-4 h-4" />} label={t('species.naturalHistory.title')} value={<span role="status">{t('species.naturalHistory.loading')}</span>} />;
  if (!data) return null;
  return (
    <>
      {(['phylum', 'class_name', 'order_name', 'family'] as const).map((rank) => {
        const taxon = data[rank];
        if (!taxon) return null;
        return <DetailRow key={rank} icon={<GitBranch className="w-4 h-4" />} label={t(`species.naturalHistory.${rank}`)} value={t(`species.naturalHistory.taxa.${taxon}`, { defaultValue: taxon })} />;
      })}
      {(['size', 'weight'] as const).map((key) => {
        const metric = data.measurements?.[key];
        if (!metric) return null;
        const Icon = key === 'size' ? Ruler : Weight;
        const suffix = metric.kind === 'range' ? 'Range' : metric.kind === 'estimate' ? 'Estimate' : 'Average';
        return <DetailRow key={key} icon={<Icon className="w-4 h-4" />} label={t(`species.naturalHistory.${key}${suffix}`)} value={measurement(metric.value)} />;
      })}
    </>
  );
}
