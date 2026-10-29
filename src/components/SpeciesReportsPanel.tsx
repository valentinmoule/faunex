import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Check, Eye, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalogueModeration, deleteBestiarySpecies } from '@/hooks/useCatalogueModeration';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import ReportedSpeciesPreview from '@/components/ReportedSpeciesPreview';
import { type AnimalCard, normalizeRarity } from '@/data/mockData';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';

interface Report {
  id: string;
  species_name: string;
  scientific_name: string | null;
  reason: string | null;
  report_type: string | null;
  created_at: string;
}

/** Reports retain their own actions, separate from personal capture moderation. */
export default function SpeciesReportsPanel() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { speciesName } = useSpeciesName();
  const { canDeleteSpecies } = useCatalogueModeration(session?.user.id, true);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ card: AnimalCard; ids: string[] } | null>(null);

  const load = async () => {
    setLoadError(false);
    const { data, error } = await supabase.from('species_reports')
      .select('id,species_name,scientific_name,reason,report_type,created_at')
      .eq('status', 'pending').order('created_at', { ascending: false });
    if (error) { setLoadError(true); return; }
    setReports(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const closeReports = async (ids: string[], status: 'resolved' | 'dismissed') => {
    const { data, error } = await supabase.from('species_reports').update({ status })
      .in('id', ids).eq('status', 'pending').select('id');
    if (error || !data?.length) throw error ?? new Error('No report updated');
    const closed = new Set(data.map(report => report.id));
    setReports(current => (current ?? []).filter(report => !closed.has(report.id)));
  };

  const close = async (list: Report[], status: 'resolved' | 'dismissed') => {
    const first = list[0];
    if (!first || busyRef.current) return;
    busyRef.current = true;
    setBusy(first.id);
    try {
      await closeReports(list.map(report => report.id), status);
      toast.success(t(`species.reportsAdmin.${status}`));
    } catch { toast.error(t('species.reportsAdmin.actionError')); }
    finally { busyRef.current = false; setBusy(null); }
  };

  const openEntry = async (list: Report[], deleting = false) => {
    const report = list[0];
    if (!report || busyRef.current || (deleting && !canDeleteSpecies)) return;
    busyRef.current = true;
    setBusy(report.id);
    try {
      const { data: animal, error } = await supabase.from('animals')
        .select('name,scientific_name,category,rarity').eq('name', report.species_name).maybeSingle();
      if (error) throw error;
      if (!animal) { toast.info(t('species.reportsAdmin.missing')); return; }
      const { data: profile, error: profileError } = await supabase.from('species_profiles')
        .select('description,habitat,diet,conservation,fun_fact').eq('animal_name', animal.name).maybeSingle();
      if (profileError) throw profileError;
      const card: AnimalCard = {
        id: `uncaptured-${animal.name}`, name: animal.name,
        scientificName: animal.scientific_name ?? '', image: '',
        rarity: normalizeRarity(animal.rarity), category: animal.category,
        description: profile?.description ?? '', habitat: profile?.habitat ?? '',
        diet: profile?.diet ?? '', conservation: profile?.conservation ?? '', funFact: profile?.fun_fact ?? '',
        discoveredAt: '', location: '',
      };
      if (deleting) setDeleteTarget({ card, ids: list.map(item => item.id) });
      else setSelectedCard(card);
    } catch { toast.error(t('species.reportsAdmin.actionError')); }
    finally { busyRef.current = false; setBusy(null); }
  };

  const removeEntry = async () => {
    if (!deleteTarget || !canDeleteSpecies || busyRef.current) return;
    const target = deleteTarget;
    busyRef.current = true;
    setBusy(target.ids[0] ?? target.card.id);
    try {
      await deleteBestiarySpecies(target.card.name, target.card.scientificName);
      setDeleteTarget(null);
      setSelectedCard(null);
      toast.success(t('species.adminDelete.success'));
      try { await closeReports(target.ids, 'resolved'); }
      catch { toast.warning(t('species.reportsAdmin.deleteCloseError')); }
    } catch { toast.error(t('species.adminDelete.error')); }
    finally { busyRef.current = false; setBusy(null); }
  };

  if (loadError) return <div className="space-y-3 py-16 text-center"><p className="text-muted-foreground">{t('species.reportsAdmin.loadError')}</p><Button variant="outline" onClick={() => void load()}>{t('species.reportsAdmin.retry')}</Button></div>;
  if (!reports) return <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  if (reports.length === 0) return <p className="py-16 text-center font-display text-muted-foreground">{t('species.reportsAdmin.empty')}</p>;

  const groups = new Map<string, Report[]>();
  for (const report of reports) {
    const key = report.species_name.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }

  return <>
    <div className="mx-auto max-w-lg divide-y divide-border">
      {[...groups.values()].map(list => {
        const first = list[0];
        if (!first) return null;
        return <div key={first.id} className="space-y-3 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-display font-bold text-foreground">{speciesName(first.species_name)}</p>
              {first.scientific_name && <p className="break-words text-xs italic text-muted-foreground">{first.scientific_name}</p>}
              {list.some(report => report.report_type === 'does_not_exist') && <p className="text-xs font-semibold text-destructive">{t('species.reportsAdmin.doesNotExist')}</p>}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{t('species.reportsAdmin.count', { count: list.length })}</span>
          </div>
          {list.filter(report => report.reason).map(report => <p key={report.id} className="break-words text-sm text-muted-foreground">« {report.reason} »</p>)}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void openEntry(list)}><Eye className="mr-2 h-4 w-4 shrink-0" />{t('species.reportsAdmin.view')}</Button>
            {canDeleteSpecies && <Button size="sm" variant="outline" className="text-destructive" disabled={!!busy} onClick={() => void openEntry(list, true)}><Trash2 className="mr-2 h-4 w-4 shrink-0" />{t('species.reportsAdmin.delete')}</Button>}
            <Button size="sm" disabled={!!busy} onClick={() => void close(list, 'resolved')}>{busy === first.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{t('species.reportsAdmin.resolve')}</Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void close(list, 'dismissed')}><X className="mr-2 h-4 w-4" />{t('species.reportsAdmin.dismiss')}</Button>
          </div>
        </div>;
      })}
    </div>
    <ReportedSpeciesPreview card={selectedCard} onClose={() => setSelectedCard(null)} />
    <ConfirmDialog open={!!deleteTarget} title={t('species.adminDelete.title', { name: speciesName(deleteTarget?.card.name) })}
      description={t('species.adminDelete.description')} confirmLabel={t('species.adminDelete.confirm')}
      icon={<Trash2 className="h-6 w-6" />} busy={!!busy} onConfirm={() => void removeEntry()}
      onOpenChange={open => { if (!open) setDeleteTarget(null); }} />
  </>;
}
