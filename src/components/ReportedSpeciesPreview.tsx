import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSpeciesFacts, useSpeciesName } from '@/hooks/useSpeciesLocale';
import type { AnimalCard } from '@/data/mockData';

/** Moderation reads the existing facts without requiring a personal capture. */
export default function ReportedSpeciesPreview({ card, onClose }: { card: AnimalCard | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { speciesName } = useSpeciesName();
  const facts = useSpeciesFacts(card);
  return <Dialog open={!!card} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto" aria-describedby="reported-species-scientific">
      <DialogHeader>
        <DialogTitle className="pr-6 break-words">{speciesName(card?.name)}</DialogTitle>
        <DialogDescription id="reported-species-scientific" className="break-words italic">{card?.scientificName}</DialogDescription>
      </DialogHeader>
      {facts.description && <p className="whitespace-pre-line text-sm text-foreground">{facts.description}</p>}
      {([
        ['capture.detail.habitat', facts.habitat],
        ['capture.detail.diet', facts.diet],
        ['capture.detail.conservation', card?.conservation],
        ['species.sections.funFact', facts.funFact],
      ] as const).map(([label, value]) => value ? <div key={label} className="space-y-1 border-t border-border pt-3">
        <h3 className="text-sm font-semibold text-foreground">{t(label)}</h3>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{value}</p>
      </div> : null)}
    </DialogContent>
  </Dialog>;
}