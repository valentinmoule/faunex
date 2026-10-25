import { useTranslation } from 'react-i18next';
import { GitBranch, Ruler, Weight } from 'lucide-react';
import { useSpeciesNaturalHistory } from '@/hooks/useSpeciesNaturalHistory';

export default function SpeciesNaturalHistory({ name, scientificName }: { name: string; scientificName?: string }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useSpeciesNaturalHistory(name, scientificName, true);
  const measurement = (value: string) => value.replace(' to ', '–').replace(/\d+(?:\.\d+)?/g, (n) => Number(n).toLocaleString(i18n.language));
  return (
    <section className="space-y-3 border-t border-border/60 pt-4">
      <h4 className="flex items-center gap-2 text-sm font-display font-semibold"><GitBranch className="size-4 text-primary" />{t('species.naturalHistory.title')}</h4>
      {isLoading ? <p className="text-xs text-muted-foreground" role="status">{t('species.naturalHistory.loading')}</p> : (
        <>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
            {(['phylum', 'class_name', 'order_name', 'family'] as const).map((rank) => (
              <div key={rank} className="min-w-0"><dt className="text-xs text-muted-foreground">{t(`species.naturalHistory.${rank}`)}</dt><dd className="mt-0.5 break-words text-sm font-medium">{data?.[rank] || t('species.naturalHistory.unknown')}</dd></div>
            ))}
          </dl>
          <dl className="grid grid-cols-2 gap-5 border-t border-border/60 pt-3">
            {(['size', 'weight'] as const).map((key) => {
              const metric = data?.measurements?.[key];
              const Icon = key === 'size' ? Ruler : Weight;
              return <div key={key} className="min-w-0"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-4 shrink-0" />{t(`species.naturalHistory.${key}${metric?.kind === 'range' ? 'Range' : 'Average'}`)}</dt><dd className="mt-1 break-words text-sm font-medium">{metric ? measurement(metric.value) : t('species.naturalHistory.unknown')}</dd></div>;
            })}
          </dl>
          {data?.sources?.length ? <p className="text-[10px] leading-relaxed text-muted-foreground">{t('species.naturalHistory.sources')}{' '}{data.sources.map((source, i) => <span key={source.url}>{i > 0 && ' · '}<a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{source.label}</a></span>)}</p> : isError ? <p className="text-xs text-muted-foreground">{t('species.naturalHistory.unavailable')}</p> : null}
        </>
      )}
    </section>
  );
}