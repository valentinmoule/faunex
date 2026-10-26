import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, GitBranch, Ruler, Weight } from 'lucide-react';
import { useSpeciesNaturalHistory } from '@/hooks/useSpeciesNaturalHistory';
import DetailRow from '@/components/DetailRow';

// Only documented values are shown: a missing rank or measurement hides its
// row, and a lookup failure hides the toggle instead of an "unavailable" line.
// The toggle reveals classification and measurements; it stays flat, like the
// other list rows — never a boxed or shadowed control.
export default function SpeciesNaturalHistory({ name, scientificName }: { name: string; scientificName?: string }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useSpeciesNaturalHistory(name, scientificName, true);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [name, scientificName]);
  const measurement = (value: string) => value.replace(' to ', '–').replace(/\d+(?:\.\d+)?/g, (n) => Number(n).toLocaleString(i18n.language));
  if (isLoading) return null;
  if (!data) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="text-muted-foreground"><GitBranch className="h-4 w-4" /></span>
        <span className="flex-1 text-sm text-foreground/85">{t('species.naturalHistory.moreData')}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
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
      )}
    </>
  );
}
