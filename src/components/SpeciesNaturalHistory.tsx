import { useTranslation } from 'react-i18next';
import { GitBranch, Ruler, Weight } from 'lucide-react';
import { useSpeciesNaturalHistory } from '@/hooks/useSpeciesNaturalHistory';
import DetailRow from '@/components/DetailRow';

export default function SpeciesNaturalHistory({ name, scientificName }: { name: string; scientificName?: string }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useSpeciesNaturalHistory(name, scientificName, true);
  const measurement = (value: string) => value.replace(' to ', '–').replace(/\d+(?:\.\d+)?/g, (n) => Number(n).toLocaleString(i18n.language));
  if (isLoading) return <DetailRow icon={<GitBranch className="w-4 h-4" />} label={t('species.naturalHistory.title')} value={<span role="status">{t('species.naturalHistory.loading')}</span>} />;
  if (isError) return <DetailRow icon={<GitBranch className="w-4 h-4" />} label={t('species.naturalHistory.title')} value={t('species.naturalHistory.unavailable')} />;
  if (!data) return null;
  return (
    <>
      {(['phylum', 'class_name', 'order_name', 'family'] as const).map((rank) => {
        const taxon = data[rank];
        return <DetailRow key={rank} icon={<GitBranch className="w-4 h-4" />} label={t(`species.naturalHistory.${rank}`)} value={taxon ? t(`species.naturalHistory.taxa.${taxon}`, { defaultValue: taxon }) : t('species.naturalHistory.unknown')} />;
      })}
      {(['size', 'weight'] as const).map((key) => {
        const metric = data.measurements?.[key];
        const Icon = key === 'size' ? Ruler : Weight;
        return <DetailRow key={key} icon={<Icon className="w-4 h-4" />} label={t(`species.naturalHistory.${key}${metric?.kind === 'range' ? 'Range' : 'Average'}`)} value={metric ? measurement(metric.value) : t('species.naturalHistory.unknown')} />;
      })}
      {data.sources?.length > 0 && <div className="px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">{t('species.naturalHistory.sources')}{' '}{data.sources.map((source, i) => <span key={source.url}>{i > 0 && ' · '}<a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{source.label}</a></span>)}</div>}
    </>
  );
}