import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Merge, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { removeCatalogueEntry } from '@/lib/bestiaryCache';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';
import { toast } from 'sonner';
export type ReportAction = 'vernacular' | 'scientific' | 'merge';
export interface ReportActionSource { id: string; name: string; scientific_name: string | null; reportIds: string[] }
interface Candidate { id: string; name: string; scientific_name: string | null }
export default function SpeciesReportActionDialog({ source, action, onClose, onSaved }: {
 source: ReportActionSource | null; action: ReportAction; onClose: () => void; onSaved: () => void;
}) {
 const { t } = useTranslation();
 const { speciesName } = useSpeciesName();
 const [value, setValue] = useState('');
 const [query, setQuery] = useState('');
 const [results, setResults] = useState<Candidate[]>([]);
 const [target, setTarget] = useState<Candidate | null>(null);
 const [searching, setSearching] = useState(false);
 const [searchError, setSearchError] = useState(false);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const locked = useRef(false);
 useEffect(() => { setValue(action === 'scientific' ? source?.scientific_name ?? '' : source?.name ?? ''); setTarget(null); setQuery(''); setResults([]); setError(''); }, [source, action]);
 useEffect(() => {
  if (!source || action !== 'merge' || query.trim().length < 2) { setResults([]); setSearching(false); return; }
  let cancelled = false;
  setSearching(true); setSearchError(false);
  const timer = setTimeout(async () => {
   const term = query.trim().replace(/[%_,().]/g, ' ');
   const { data, error } = await supabase.from('animals').select('id,name,scientific_name')
    .neq('id', source.id).or(`name.ilike.%${term}%,scientific_name.ilike.%${term}%`).order('name').limit(25);
   if (!cancelled) { setResults(data ?? []); setSearchError(!!error); setSearching(false); }
  }, 250);
  return () => { cancelled = true; clearTimeout(timer); };
 }, [source, action, query]);
 const save = async () => {
  if (!source || locked.current || (action === 'merge' ? !target : !value.trim())) return;
  locked.current = true; setSaving(true); setError('');
  try {
   const { error } = await supabase.rpc('admin_reported_species_action', {
    p_report_ids: source.reportIds, p_animal_id: source.id, p_expected_name: source.name,
    p_expected_scientific: source.scientific_name ?? '', p_action: action,
    p_value: value.trim(), p_target_id: target?.id ?? undefined,
   });
   if (error) throw error;
   removeCatalogueEntry(source.name);
   toast.success(t('species.reportsAdmin.saved'));
   onSaved(); onClose();
  } catch (failure) {
   const message = (failure as { message?: string }).message ?? '';
   if ((failure as { code?: string }).code === '57014') { setError(t('species.reportsAdmin.errors.timeout')); return; }
   const code = ['MERGE_CAPTURE_CONFLICT','DISTINCT_SPECIES','NAME_EXISTS','STALE_SPECIES','STALE_REPORT','NO_CHANGE','IDENTITY_CONFLICT'].find(code => message.includes(code));
   setError(t(`species.reportsAdmin.errors.${code ?? 'generic'}`));
  } finally { locked.current = false; setSaving(false); }
 };
 return <Dialog open={!!source} onOpenChange={open => { if (!open && !saving) onClose(); }}>
  <DialogContent className="max-h-[85dvh] overflow-y-auto" onEscapeKeyDown={event => { if (saving) event.preventDefault(); }} onPointerDownOutside={event => { if (saving) event.preventDefault(); }}>
   <DialogHeader><DialogTitle className="pr-6">{t(`species.reportsAdmin.${action}`)}</DialogTitle><DialogDescription>{source?.name} {source?.scientific_name && `(${source.scientific_name})`}</DialogDescription></DialogHeader>
   {action === 'merge' ? <>
    <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={t('species.reportsAdmin.search')} placeholder={t('species.reportsAdmin.search')} value={query} disabled={saving} onChange={e => { setQuery(e.target.value); setTarget(null); }} className="pl-9" /></div>
    {searching ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : searchError ? <p role="alert" className="text-sm text-destructive">{t('species.reportsAdmin.loadError')}</p> : query.trim().length >= 2 && !results.length ? <p className="text-sm text-muted-foreground">{t('species.reportsAdmin.noResults')}</p> : null}
    <div className="max-h-64 divide-y divide-border overflow-y-auto" role="radiogroup" aria-label={t('species.reportsAdmin.target')}>
     {results.map(candidate => <label key={candidate.id} className="flex cursor-pointer items-center gap-3 py-3"><input type="radio" name="merge-target" checked={target?.id === candidate.id} disabled={saving} onChange={() => setTarget(candidate)} className="accent-primary" /><span className="min-w-0"><span className="block break-words text-sm font-semibold">{speciesName(candidate.name)}</span><span className="block break-words text-xs italic text-muted-foreground">{candidate.scientific_name}</span></span></label>)}
    </div>
    {target && <p className="text-sm font-medium text-primary">{t('species.reportsAdmin.mergeConfirm', { source: source?.name, target: target.name })}</p>}
   </> : <div className="space-y-2"><label htmlFor="report-new-name" className="text-sm font-semibold">{t(`species.reportsAdmin.${action}Label`)}</label><Input id="report-new-name" value={value} maxLength={200} disabled={saving} onChange={e => setValue(e.target.value)} /></div>}
   {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
   <div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={saving} onClick={onClose}>{t('common.cancel')}</Button><Button disabled={saving || (action === 'merge' ? !target : !value.trim() || value.trim() === (action === 'scientific' ? source?.scientific_name : source?.name))} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : action === 'merge' ? <Merge className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}{t(action === 'merge' ? 'species.reportsAdmin.mergeSave' : 'common.save')}</Button></div>
  </DialogContent>
 </Dialog>;
}
